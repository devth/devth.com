export function glyphContours(mark) {
  try {
    const style = getComputedStyle(mark);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 160;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.font = `${style.fontWeight} 96px ${style.fontFamily}`;
    const scale = parseFloat(style.fontSize) / 96;
    const box = mark.getBoundingClientRect();
    const text = mark.firstChild;
    if (text?.nodeType !== Node.TEXT_NODE) return [];
    return [...text.textContent].flatMap((character, index) => {
      if (!/\p{L}/u.test(character)) return [];
      context.clearRect(0, 0, 160, 160);
      context.fillText(character, 32, 112);
      const pixels = context.getImageData(0, 0, 160, 160).data;
      const columns = Array(160).fill(0),
        rows = [];
      for (let y = 0; y < 160; y++) {
        const spans = [];
        let left = -1;
        for (let x = 0; x <= 160; x++) {
          const ink = x < 160 && pixels[(y * 160 + x) * 4 + 3] >= 128;
          if (ink) {
            columns[x]++;
            if (left < 0) left = x;
          } else if (left >= 0) {
            spans.push([left, x - 1]);
            left = -1;
          }
        }
        if (spans.length) rows.push({ y, spans });
      }
      if (!rows.length) return [];
      const axis = columns.indexOf(Math.max(...columns));
      const samples = Array.from({ length: 17 }, (_, i) => {
        const row = rows[Math.round((1 - i / 16) * (rows.length - 1))];
        const span = row.spans.reduce((best, next) =>
          Math.abs((next[0] + next[1]) / 2 - axis) < Math.abs((best[0] + best[1]) / 2 - axis)
            ? next
            : best,
        );
        return { y: row.y, span };
      });
      const widths = samples.map(({ span }) => span[1] - span[0] + 1).sort((a, b) => a - b);
      const halfStem = widths[8] / 2;
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const rect = range.getBoundingClientRect();
      const ascent = context.measureText(character).fontBoundingBoxAscent;
      if (!Number.isFinite(ascent)) return [];
      return [
        {
          points: samples.map(({ y, span: [left, right] }) => {
            const radius = Math.min((right - left + 1) / 2, halfStem);
            const center = Math.max(left + radius, Math.min(right - radius, axis));
            return [
              rect.left - box.left + (center - 32) * scale,
              rect.top - box.top + (ascent + y - 112) * scale,
              radius * scale,
            ];
          }),
          height: rows.length * scale,
        },
      ];
    });
  } catch {
    // Restricted canvas must not disable ordinary hover art or links.
    return [];
  }
}

export function weaveFrame(glyphs, progress = 1, phase = 0, project = (point) => point) {
  const drawing = { back: "", front: "", accent: "" };
  const total = glyphs.reduce((sum, glyph) => sum + glyph.points.length + 1, 0);
  let cursor = 0;
  const coordinate = (point) =>
    project(point)
      .map((value) => value.toFixed(2))
      .join(" ");
  const mix = (a, b, p) => a.map((value, axis) => value + (b[axis] - value) * p);
  function curve(start, control, end, layer) {
    const part = Math.min(1, Math.max(0, progress) * total - cursor++);
    if (part <= 0) return;
    const nextControl = mix(start, control, part);
    const nextEnd = mix(nextControl, mix(control, end, part), part);
    drawing[layer] += `M${coordinate(start)}Q${coordinate(nextControl)} ${coordinate(nextEnd)}`;
  }
  glyphs.forEach((glyph, index) => {
    const count = glyph.points.length - 1;
    const turns = glyph.height < 40 ? 1.5 : 3;
    const angle = (i) => (i / count) * Math.PI * 2 * turns + phase + index;
    function coil(point, i) {
      const radius = point[2] + Math.max(1.5, Math.min(8, glyph.height * 0.025));
      return [point[0] + Math.sin(angle(i)) * radius, point[1] + Math.cos(angle(i)) * radius * 0.2];
    }
    for (let i = 0; i < count; i++) {
      const start = coil(glyph.points[i], i),
        end = coil(glyph.points[i + 1], i + 1);
      const middle = coil(mix(glyph.points[i], glyph.points[i + 1], 0.5), i + 0.5);
      const control = middle.map((value, axis) => 2 * value - (start[axis] + end[axis]) / 2);
      curve(start, control, end, Math.cos(angle(i + 0.5)) < 0 ? "back" : "front");
    }
    const stem = coil(glyph.points[Math.floor(count * 0.4)], Math.floor(count * 0.4));
    const leaf = Math.max(2, Math.min(8, glyph.height * 0.06));
    const tip = [stem[0] - leaf, stem[1] - leaf * 1.4];
    curve(stem, [tip[0], stem[1]], tip, "accent");
    curve(tip, [stem[0] + leaf * 0.3, tip[1]], stem, "accent");
  });
  return drawing;
}
