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

export function steerInk(point, angle, sample, reach = 18, padding = 3) {
  if (point[2] < 0 || point[2] > 8) return angle;
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  for (let step = 0; step <= 6; step++) {
    const hit = sample(point[0] + (dx * reach * step) / 6, point[1] + (dy * reach * step) / 6);
    if (!hit || hit.distance >= padding) continue;
    const length = Math.hypot(hit.nx, hit.ny);
    const nx = length ? hit.nx / length : -dx,
      ny = length ? hit.ny / length : -dy;
    if (hit.distance >= 0 && dx * nx + dy * ny >= 0) continue;
    const side = dx * -ny + dy * nx >= 0 ? 1 : -1;
    const heading = Math.atan2(side * nx + ny * 0.3, -side * ny + nx * 0.3);
    const turn = Math.atan2(Math.sin(heading - angle), Math.cos(heading - angle));
    return angle + Math.max(-1.2, Math.min(1.2, turn));
  }
  return angle;
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
export function guideLogo(point, angle, origin, unit) {
  if (point[2] < 0 || point[2] > 8) return angle;
  const mark = cache?.mark.isConnected ? cache.mark : document.querySelector(".brand-mark");
  if (!mark) return angle;
  const box = mark.getBoundingClientRect();
  const x = point[0] * unit + origin[0],
    y = point[1] * unit + origin[1];
  const margin = 24;
  if (
    x < box.left - margin ||
    x > box.right + margin ||
    y < box.top - margin ||
    y > box.bottom + margin
  )
    return angle;
  const layout = `${box.width}:${box.height}`;
  if (cache?.mark !== mark || cache.layout !== layout)
    cache = { mark, layout, glyphs: rasterize(mark, box) };
  return steerInk([x - box.left, y - box.top, point[2]], angle, (px, py) => {
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
}
