export function inkField(alpha, width, height) {
  function distanceTo(ink) {
    const distance = Float32Array.from(alpha, (value) =>
      (ink ? value >= 128 : value < 128) ? 0 : 100000,
    );
    for (const direction of [1, -1]) {
      const start = direction === 1 ? 0 : height - 1;
      for (let y = start; y >= 0 && y < height; y += direction) {
        for (let x = direction === 1 ? 0 : width - 1; x >= 0 && x < width; x += direction) {
          const i = y * width + x,
            previousX = x - direction,
            previousY = y - direction;
          let value = distance[i];
          if (previousX >= 0 && previousX < width)
            value = Math.min(value, distance[i - direction] + 1);
          if (previousY >= 0 && previousY < height) {
            const previous = previousY * width + x;
            value = Math.min(value, distance[previous] + 1);
            if (x > 0) value = Math.min(value, distance[previous - 1] + Math.SQRT2);
            if (x < width - 1) value = Math.min(value, distance[previous + 1] + Math.SQRT2);
          }
          distance[i] = value;
        }
      }
    }
    return distance;
  }
  const outside = distanceTo(true),
    inside = distanceTo(false);
  const signed = outside.map((value, i) => value - inside[i]);
  return (x, y) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return null;
    const i = y * width + x;
    return {
      distance: signed[i],
      nx: signed[i + 1] - signed[i - 1],
      ny: signed[i + width] - signed[i - width],
    };
  };
}

const tau = Math.PI * 2;

/** Marches a tip's next stretch into real ink and measures the stroke it meets. */
export function findStroke(point, angle, sample, reach = 28, through = 160) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  let normal, deepest;
  for (let travelled = 0; travelled <= reach + through; travelled += 2) {
    const x = point[0] + dx * travelled,
      y = point[1] + dy * travelled;
    const hit = sample(x, y);
    if (!normal) {
      if (travelled > reach) return null;
      if (!hit || hit.distance >= 0) continue;
      const length = Math.hypot(hit.nx, hit.ny);
      if (!length || (dx * hit.nx + dy * hit.ny) / length >= 0) return null;
      normal = [hit.nx / length, hit.ny / length];
    }
    if (!hit || hit.distance >= 0) break;
    if (!deepest || hit.distance < deepest.distance)
      deepest = { center: [x, y], distance: hit.distance };
  }
  return deepest ? { center: deepest.center, halfWidth: -deepest.distance, normal } : null;
}

/** A vine unit that coils around the met stroke: front quarter-turns cross over
 * the letter, rear ones pass behind it, and it leaves on the far side. */
export function wrapPlan(point, angle, { center, halfWidth, normal }, maxCurves = 24) {
  const radius = halfWidth + 6;
  let tangent = [-normal[1], normal[0]];
  if (tangent[0] * Math.cos(angle) + tangent[1] * Math.sin(angle) < 0)
    tangent = tangent.map((value) => -value);
  const pitch = Math.min(60, Math.max(14, radius * 0.8));
  const depth = point[2] < 0 ? -1 : 1;
  let quarters = radius < 40 ? 10 : 6;
  while (quarters + 1 > maxCurves && quarters > 6) quarters -= 4;
  if (quarters + 1 > maxCurves) return null;
  const at = (cosine, sine, theta) => [
    center[0] +
      normal[0] * radius * cosine +
      tangent[0] * ((pitch * theta) / tau + radius * 0.22 * sine),
    center[1] +
      normal[1] * radius * cosine +
      tangent[1] * ((pitch * theta) / tau + radius * 0.22 * sine),
    depth * radius * sine,
  ];
  const position = (theta) => at(Math.cos(theta), Math.sin(theta), theta);
  const first = position(0);
  const curves = [
    {
      start: point,
      control: point.map((value, axis) => (value + first[axis]) / 2),
      end: first,
      accent: false,
    },
  ];
  for (let quarter = 0; quarter < quarters; quarter++) {
    const a = (quarter * Math.PI) / 2,
      b = a + Math.PI / 2;
    curves.push({
      start: position(a),
      control: at(Math.cos(a) + Math.cos(b), Math.sin(a) + Math.sin(b), (a + b) / 2),
      end: position(b),
      accent: false,
    });
  }
  const last = curves.at(-1);
  return {
    curves,
    exit: last.end,
    angle: Math.atan2(last.end[1] - last.control[1], last.end[0] - last.control[0]),
  };
}

function rasterize(mark, box) {
  try {
    const style = getComputedStyle(mark),
      scale = parseFloat(style.fontSize) / 96;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 160;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.font = `${style.fontWeight} 96px ${style.fontFamily}`;
    const nodes = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT),
      glyphs = [];
    while (nodes.nextNode()) {
      const text = nodes.currentNode;
      for (let index = 0; index < text.length; index++) {
        const character = text.textContent[index];
        if (!character.trim()) continue;
        const metrics = context.measureText(character);
        const ascent = metrics.fontBoundingBoxAscent;
        if (!Number.isFinite(ascent)) continue;
        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        const rect = range.getBoundingClientRect();
        let field,
          failed = false;
        glyphs.push({
          left: rect.left - box.left - 32 * scale,
          top: rect.top - box.top + (ascent - 112) * scale,
          scale,
          sample(x, y) {
            const halo = 3 / scale + 2;
            if (
              failed ||
              x < 32 - metrics.actualBoundingBoxLeft - halo ||
              x > 32 + metrics.actualBoundingBoxRight + halo ||
              y < 112 - metrics.actualBoundingBoxAscent - halo ||
              y > 112 + metrics.actualBoundingBoxDescent + halo
            )
              return null;
            if (!field) {
              try {
                context.clearRect(0, 0, 160, 160);
                context.fillText(character, 32, 112);
                const pixels = context.getImageData(0, 0, 160, 160).data;
                field = inkField(
                  Uint8Array.from({ length: 160 * 160 }, (_, i) => pixels[i * 4 + 3]),
                  160,
                  160,
                );
              } catch {
                failed = true;
                return null;
              }
            }
            return field(x, y);
          },
        });
      }
    }
    return glyphs;
  } catch {
    return [];
  }
}

let cache;
export function wrapLogo(point, angle, maxCurves, origin, unit) {
  if (Math.abs(point[2]) > 48) return null;
  const mark = cache?.mark.isConnected ? cache.mark : document.querySelector(".brand-mark");
  if (!mark) return null;
  const box = mark.getBoundingClientRect();
  const x = point[0] * unit + origin[0],
    y = point[1] * unit + origin[1];
  const margin = 32;
  if (
    x < box.left - margin ||
    x > box.right + margin ||
    y < box.top - margin ||
    y > box.bottom + margin
  )
    return null;
  const layout = `${box.width}:${box.height}`;
  if (cache?.mark !== mark || cache.layout !== layout)
    cache = { mark, layout, glyphs: rasterize(mark, box) };
  const stroke = findStroke([x - box.left, y - box.top], angle, (px, py) => {
    let closest = null;
    for (const glyph of cache.glyphs) {
      const hit = glyph.sample((px - glyph.left) / glyph.scale, (py - glyph.top) / glyph.scale);
      if (hit) {
        hit.distance *= glyph.scale;
        if (!closest || hit.distance < closest.distance) closest = hit;
      }
    }
    return closest;
  });
  if (!stroke) return null;
  return wrapPlan(
    point,
    angle,
    {
      center: [
        (stroke.center[0] + box.left - origin[0]) / unit,
        (stroke.center[1] + box.top - origin[1]) / unit,
      ],
      halfWidth: stroke.halfWidth / unit,
      normal: stroke.normal,
    },
    maxCurves,
  );
}
