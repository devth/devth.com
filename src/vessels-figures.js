// SVG renderers for /vessels. Each is a pure function of (state, width, time)
// returning markup, so the build can pre-render a static figure and the page
// can redraw the same figure live. Colors come from CSS classes.
import {
  severinghaus,
  saturation,
  STANDARD_CURVE,
  STANDARD_P50,
  oxygenContent,
  redCellIndices,
  CBC_RANGES,
  poiseuille,
  relativeViscosity,
  oxygenTransport,
  optimalHematocrit,
  CIRCUIT,
  meanSpeed,
  netFiltration,
  filtrationCrossing,
  cellsPerMicroliter,
} from "./vessels-models.js";

export const SHIFTED_P50 = 32;
export const LANDMARKS = [
  { po2: 100, name: "lungs" },
  { po2: 40, name: "resting tissue" },
  { po2: 20, name: "working muscle" },
];

export const defaults = {
  circuit: { level: "capillaries" },
  radius: { radius: 0.8 },
  tube: { rbc: 5, mcv: 90, mch: 30, settle: 1 },
  curve: { po2: 40, shifted: false },
  content: { hb: 15 },
  viscosity: { hct: 0.45, diameter: 1000 },
  capillary: { oncotic: 25, arterial: 35 },
  guards: { time: 12 },
};

const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (value) => String(value).replace(/[&<>"]/g, (c) => escapeMap[c]);
const fix = (value, digits = 1) => Number(value).toFixed(digits);
const p = (value) => Math.round(value * 10) / 10;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const mod = (value, m) => ((value % m) + m) % m;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function svg(width, height, label, body) {
  return `<svg class="vx-svg" width="${width}" height="${p(height)}" viewBox="0 0 ${width} ${p(height)}" role="img" aria-label="${esc(label)}">${body}</svg>`;
}
const text = (x, y, value, cls = "vx-label", extra = "") =>
  `<text x="${p(x)}" y="${p(y)}" class="${cls}"${extra ? " " + extra : ""}>${esc(value)}</text>`;
const line = (x1, y1, x2, y2, cls) =>
  `<line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}" class="${cls}"/>`;
const linear = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
const logScale = (d0, d1, r0, r1) => {
  const a = Math.log(d0);
  const b = Math.log(d1);
  return (v) => r0 + ((Math.log(v) - a) / (b - a)) * (r1 - r0);
};
const pathOf = (points) => points.map(([x, y], i) => `${i ? "L" : "M"}${p(x)},${p(y)}`).join("");
/** Moving elements, extracted by the page on each animation frame. */
export const MOTION_START = "<g data-vx-motion>";
export const MOTION_END = "</g><!--/m-->";
const motion = (markup) => MOTION_START + markup + MOTION_END;
const mix = (oxygenated) =>
  `color-mix(in oklab, var(--vx-oxy) ${p(clamp(oxygenated, 0, 1) * 100)}%, var(--vx-deoxy))`;

/** Axes, grid and tick labels for a chart box. */
function frame({ x0, y0, w, h, xs, ys, xTicks, yTicks, xFmt, yFmt, xTitle, yTitle, edges }) {
  let out = "";
  for (const t of yTicks) out += line(x0, ys(t), x0 + w, ys(t), "vx-grid");
  for (const t of yTicks) out += text(x0 - 6, ys(t) + 4, yFmt(t), "vx-tick", 'text-anchor="end"');
  out += line(x0, y0 + h, x0 + w, y0 + h, "vx-axis");
  xTicks.forEach((t, i) => {
    const anchor = edges && i === 0 ? "start" : edges && i === xTicks.length - 1 ? "end" : "middle";
    out += line(xs(t), y0 + h, xs(t), y0 + h + 4, "vx-axis");
    out += text(xs(t), y0 + h + 16, xFmt(t), "vx-tick", `text-anchor="${anchor}"`);
  });
  if (xTitle) out += text(x0 + w, y0 + h + 32, xTitle, "vx-note", 'text-anchor="end"');
  if (yTitle) out += text(x0 - 6, y0 - 10, yTitle, "vx-note");
  return out;
}

/* ── Red cell glyphs ─────────────────────────────────────────────────── */

function redCell(x, y, rx, ry, fill, cls = "vx-rbc") {
  return `<g class="${cls}"><ellipse cx="${p(x)}" cy="${p(y)}" rx="${p(rx)}" ry="${p(ry)}" style="fill:${fill}"/><ellipse cx="${p(x)}" cy="${p(y)}" rx="${p(rx * 0.5)}" ry="${p(ry * 0.42)}" class="vx-rbc-center"/></g>`;
}

/* ── Figure 1: the circuit ───────────────────────────────────────────── */

const WALLS = {
  aorta: { lumen: 0.6, intima: 0.03, media: 0.25, externa: 0.12, elastic: 5, wavy: true, cells: 5 },
  arteries: {
    lumen: 0.44,
    intima: 0.03,
    media: 0.36,
    externa: 0.17,
    muscle: true,
    wavy: true,
    cells: 3,
  },
  arterioles: {
    lumen: 0.4,
    intima: 0.05,
    media: 0.3,
    externa: 0.15,
    muscle: true,
    wavy: true,
    cells: 1,
  },
  capillaries: { lumen: 0.78, intima: 0.1, media: 0, externa: 0, basement: true, cells: 1 },
  venules: { lumen: 0.74, intima: 0.04, media: 0.08, externa: 0.12, muscle: true, cells: 2 },
  veins: {
    lumen: 0.66,
    intima: 0.03,
    media: 0.1,
    externa: 0.21,
    valve: true,
    flatten: 0.78,
    cells: 3,
  },
  cavae: { lumen: 0.7, intima: 0.02, media: 0.07, externa: 0.21, flatten: 0.9, cells: 4 },
};

function wavyCircle(cx, cy, r, waves, amplitude) {
  const points = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const rr = r + Math.sin(a * waves) * amplitude;
    points.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pathOf(points) + "Z";
}

function crossSection(id, cx, cy, R) {
  const wall = WALLS[id];
  const lumen = wall.lumen * R;
  const intimaOut = lumen + wall.intima * R;
  const mediaOut = intimaOut + wall.media * R;
  const externaOut = mediaOut + wall.externa * R;
  const ring = (r0, r1, cls) =>
    r1 > r0
      ? `<circle cx="${cx}" cy="${cy}" r="${p((r0 + r1) / 2)}" class="${cls}" style="stroke-width:${p(r1 - r0)}"/>`
      : "";
  let out = `<g${wall.flatten ? ` transform="translate(0 ${p(cy * (1 - wall.flatten))}) scale(1 ${wall.flatten})"` : ""}>`;
  out += ring(mediaOut, externaOut, "vx-externa");
  out += ring(intimaOut, mediaOut, "vx-media");
  if (wall.muscle && wall.media)
    out += `<circle cx="${cx}" cy="${cy}" r="${p((intimaOut + mediaOut) / 2)}" class="vx-muscle" style="stroke-width:${p((mediaOut - intimaOut) * 0.62)}"/>`;
  for (let i = 1; i <= (wall.elastic || 0); i++) {
    const r = intimaOut + ((mediaOut - intimaOut) * i) / (wall.elastic + 1);
    out += `<path d="${wavyCircle(cx, cy, r, 28, 1.2)}" class="vx-elastic"/>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${p(lumen)}" class="vx-lumen"/>`;
  out += wall.wavy
    ? `<path d="${wavyCircle(cx, cy, lumen + (intimaOut - lumen) / 2, 18, 1.4)}" class="vx-intima" style="stroke-width:${p(Math.max(1.5, intimaOut - lumen))}"/>`
    : ring(lumen, intimaOut, "vx-intima-ring");
  if (wall.basement)
    out += `<circle cx="${cx}" cy="${cy}" r="${p(intimaOut + 3)}" class="vx-basement"/>`;
  if (wall.valve) {
    const r = lumen * 0.96;
    out += `<path d="M${p(cx - r)},${cy} Q${p(cx - r * 0.3)},${p(cy - r * 0.15)} ${p(cx - 2)},${p(cy - r * 0.55)}" class="vx-valve"/><path d="M${p(cx + r)},${cy} Q${p(cx + r * 0.3)},${p(cy - r * 0.15)} ${p(cx + 2)},${p(cy - r * 0.55)}" class="vx-valve"/>`;
  }
  const random = rng(id.length * 97 + 11);
  const cellR = id === "capillaries" ? lumen * 0.78 : Math.min(lumen * 0.32, R * 0.12);
  for (let i = 0; i < wall.cells; i++) {
    const a = random() * Math.PI * 2;
    const d = wall.cells === 1 ? 0 : (0.3 + random() * 0.45) * (lumen - cellR);
    const arterial = ["aorta", "arteries", "arterioles"].includes(id);
    out += redCell(
      cx + Math.cos(a) * d,
      cy + Math.sin(a) * d,
      cellR,
      cellR * (id === "capillaries" ? 0.94 : 0.82),
      arterial ? "var(--vx-oxy)" : id === "capillaries" ? mix(0.86) : mix(0.75),
    );
  }
  return out + "</g>";
}

const PX_PER_CM_S = 150 / 33;
function speedLabel(cmPerSecond) {
  if (cmPerSecond >= 1)
    return `${cmPerSecond >= 10 ? Math.round(cmPerSecond) : fix(cmPerSecond)} cm/s`;
  const mm = cmPerSecond * 10;
  return `${mm >= 1 ? fix(mm) : fix(mm, 2)} mm/s`;
}
const areaLabel = (area) => `${area.toLocaleString("en-US")} cm²`;

export function circuitFacts(level) {
  const item = CIRCUIT.find((entry) => entry.id === level) || CIRCUIT[0];
  const speed = meanSpeed(item.area);
  return { ...item, speed, speedLabel: speedLabel(speed), areaLabel: areaLabel(item.area) };
}

export function renderCircuit({ level }, width, t = 0) {
  const wide = width >= 600;
  const size = wide ? 200 : Math.min(width, 220);
  const rowH = 42;
  const lanesTop = wide ? 0 : size + 46;
  const left = wide ? size + 32 : 0;
  const x0 = left + 2;
  const x1 = width - 2;
  const laneW = x1 - x0;
  const lanesBottom = lanesTop + CIRCUIT.length * rowH;
  const height = Math.max(lanesBottom + 26, wide ? size + 46 : 0);
  const cx = wide ? size / 2 : width / 2;
  let out = crossSection(level, cx, size / 2, size / 2 - 4);
  const legend =
    level === "capillaries"
      ? [
          ["vx-swatch-intima", "endothelium"],
          ["vx-swatch-basement", "basement membrane"],
        ]
      : [
          ["vx-swatch-intima", "intima"],
          ["vx-swatch-media", "media"],
          ["vx-swatch-externa", "externa"],
        ];
  const legendW = legend.length === 2 ? 190 : 186;
  let lx = cx - legendW / 2;
  for (const [cls, name] of legend) {
    out += `<rect x="${p(lx)}" y="${size + 10}" width="10" height="10" class="${cls}"/>`;
    out += text(lx + 14, size + 19, name, "vx-note");
    lx += name.length * 6.2 + 26;
  }
  out += text(
    cx,
    size + 36,
    "wall drawing not to scale",
    "vx-note vx-faint",
    'text-anchor="middle"',
  );
  let cells = "";
  CIRCUIT.forEach((entry, i) => {
    const y = lanesTop + i * rowH;
    const mid = y + 29;
    const selected = entry.id === level;
    const speed = meanSpeed(entry.area);
    out += `<g class="vx-row${selected ? " is-selected" : ""}" data-vx-level="${entry.id}">`;
    out += `<rect x="${left}" y="${y}" width="${width - left}" height="${rowH}" class="vx-row-hit"/>`;
    out += text(left + 2, y + 14, entry.name, "vx-label vx-row-name");
    out += text(
      x1,
      y + 14,
      `${areaLabel(entry.area)} · ${speedLabel(speed)}`,
      "vx-tick",
      'text-anchor="end"',
    );
    out += line(x0, mid, x1, mid, "vx-lane");
    const step = 24;
    const count = Math.ceil(laneW / step) + 1;
    const offset = speed * PX_PER_CM_S * t + i * 9;
    const fill = i < 3 ? "var(--vx-oxy)" : i === 3 ? mix(0.86) : mix(0.75);
    for (let k = 0; k < count; k++) {
      const x = x0 + mod(k * step + offset, count * step) - step / 2;
      if (x < x0 - 3 || x > x1 + 3) continue;
      cells += redCell(x, mid, 5, 3.4, fill);
    }
    out += "</g>";
  });
  out += motion(cells);
  out += text(
    x1,
    lanesBottom + 18,
    "speeds to scale · same flow through every row",
    "vx-note",
    'text-anchor="end"',
  );
  return svg(
    width,
    height,
    `Seven levels of the systemic circulation from aorta to venae cavae, with total cross-sectional area and mean blood speed for each. The ${circuitFacts(level).name} wall is shown in cross-section.`,
    out,
  );
}

/* ── Figure 2: radius and flow ───────────────────────────────────────── */

export function renderRadius({ radius }, width, t = 0) {
  const tubeH = 136;
  const cy = 72;
  const outer = 58;
  const externa = 6;
  const lumen = 29 * radius;
  const mediaIn = lumen + 2;
  const mediaOut = outer - externa;
  let out = "";
  out += `<rect x="0" y="${cy - outer}" width="${width}" height="${outer * 2}" class="vx-externa-fill"/>`;
  out += `<rect x="0" y="${p(cy - mediaOut)}" width="${width}" height="${p(mediaOut - mediaIn)}" class="vx-media-fill"/>`;
  out += `<rect x="0" y="${p(cy + mediaIn)}" width="${width}" height="${p(mediaOut - mediaIn)}" class="vx-media-fill"/>`;
  for (let x = 6; x < width; x += 13) {
    const h = (mediaOut - mediaIn) * 0.72;
    out += `<ellipse cx="${x}" cy="${p(cy - (mediaIn + mediaOut) / 2)}" rx="3.2" ry="${p(h / 2)}" class="vx-muscle-cell"/>`;
    out += `<ellipse cx="${x}" cy="${p(cy + (mediaIn + mediaOut) / 2)}" rx="3.2" ry="${p(h / 2)}" class="vx-muscle-cell"/>`;
  }
  out += `<rect x="0" y="${p(cy - mediaIn)}" width="${width}" height="${p(mediaIn * 2)}" class="vx-lumen-fill"/>`;
  out += line(0, cy - mediaIn, width, cy - mediaIn, "vx-intima-line");
  out += line(0, cy + mediaIn, width, cy + mediaIn, "vx-intima-line");
  const random = rng(7);
  const vmax = 92 * radius * radius;
  let cells = "";
  for (let i = 0; i < 40; i++) {
    const yn = (random() * 2 - 1) * 0.9;
    const x0 = random() * (width + 24);
    const v = vmax * (1 - yn * yn);
    const x = mod(x0 + v * t, width + 24) - 12;
    cells += redCell(x, cy + yn * (lumen - 3), 5.4, 3.5, "var(--vx-oxy)");
  }
  out += motion(cells);
  out += text(8, 12, "arteriole, side view", "vx-note");
  out += text(width - 8, 12, "flow →", "vx-note", 'text-anchor="end"');
  const top = tubeH + 34;
  const h = 150;
  const x0 = 40;
  const w = width - x0 - 14;
  const xs = linear(0.5, 1.5, x0, x0 + w);
  const ys = linear(0, 5.2, top + h, top);
  out += frame({
    x0,
    y0: top,
    w,
    h,
    xs,
    ys,
    xTicks: [0.5, 0.75, 1, 1.25, 1.5],
    yTicks: [0, 1, 2, 3, 4, 5],
    xFmt: (v) => `${Math.round(v * 100)}%`,
    yFmt: (v) => `${v}×`,
    xTitle: "radius vs resting",
    yTitle: "flow vs resting",
  });
  const curve = [];
  const straight = [];
  for (let r = 0.5; r <= 1.5001; r += 0.02) {
    curve.push([xs(r), ys(poiseuille(r).flow)]);
    straight.push([xs(r), ys(r)]);
  }
  out += `<path d="${pathOf(straight)}" class="vx-ref-line"/>`;
  out += `<path d="${pathOf(curve)}" class="vx-curve-accent"/>`;
  out += text(xs(1.5) - 4, ys(1.5) - 8, "if flow ∝ radius", "vx-note", 'text-anchor="end"');
  out += text(
    xs(1.38) - 6,
    ys(poiseuille(1.38).flow) + 2,
    "flow ∝ r⁴",
    "vx-label vx-accent-text",
    'text-anchor="end"',
  );
  const flow = poiseuille(radius).flow;
  out += line(x0, ys(flow), xs(radius), ys(flow), "vx-guide");
  out += line(xs(radius), ys(flow), xs(radius), top + h, "vx-guide");
  out += `<circle cx="${p(xs(radius))}" cy="${p(ys(flow))}" r="5.5" class="vx-handle"/>`;
  return svg(
    width,
    top + h + 38,
    `An arteriole at ${Math.round(radius * 100)}% of its resting radius, and a chart of flow against radius following the fourth power: flow is ${Math.round(flow * 100)}% of resting.`,
    out,
  );
}

/* ── Figure 3: the hematocrit tube ───────────────────────────────────── */

const BUFFY = 0.9;
export function renderTube({ rbc, mcv, mch, settle = 1 }, width) {
  const { hematocrit, mchc } = redCellIndices({ rbc, mcv, mch });
  const height = 300;
  const tx = 46;
  const tw = 34;
  const top = 18;
  const bottom = 280;
  const fillTop = top + 18;
  const yOf = (pct) => bottom - (pct / 100) * (bottom - fillTop);
  const outline = `M${tx},${top} L${tx},${bottom - tw / 2} A${tw / 2},${tw / 2} 0 0 0 ${tx + tw},${bottom - tw / 2} L${tx + tw},${top}`;
  let out = `<defs><clipPath id="vx-tube-clip"><path d="${outline}Z"/></clipPath></defs>`;
  const front = 100 - settle * (100 - hematocrit - BUFFY);
  out += `<g clip-path="url(#vx-tube-clip)">`;
  out += `<rect x="${tx}" y="${p(yOf(100))}" width="${tw}" height="${p(yOf(front) - yOf(100))}" class="vx-plasma-fill"/>`;
  const concentration = clamp(hematocrit / front, 0, 1);
  out += `<rect x="${tx}" y="${p(yOf(front))}" width="${tw}" height="${p(bottom - yOf(front) + 2)}" style="fill:color-mix(in oklab, var(--vx-oxy) ${p(84 + concentration * 16)}%, var(--vx-plasma))"/>`;
  if (settle > 0.85) {
    const opacity = (settle - 0.85) / 0.15;
    out += `<rect x="${tx}" y="${p(yOf(hematocrit + BUFFY) - 1)}" width="${tw}" height="${p(Math.max(3, yOf(hematocrit) - yOf(hematocrit + BUFFY)))}" class="vx-buffy" style="opacity:${p(opacity)}"/>`;
  }
  out += `</g><path d="${outline}" class="vx-tube"/>`;
  out += line(tx - 4, yOf(100), tx + tw + 4, yOf(100), "vx-axis");
  const bracket = (x, [lo, hi], label) =>
    `<path d="M${x + 4},${p(yOf(lo))} H${x} V${p(yOf(hi))} H${x + 4}" class="vx-bracket"/>` +
    text(x + 2, yOf(hi) - 6, label, "vx-tick", 'text-anchor="middle"');
  out += bracket(tx - 26, CBC_RANGES.hematocrit.male, "m");
  out += bracket(tx - 14, CBC_RANGES.hematocrit.female, "f");
  const lx = tx + tw + 10;
  if (settle > 0.98) {
    out += line(tx + tw, yOf(hematocrit), lx + 2, yOf(hematocrit), "vx-guide-accent");
    out += text(lx + 6, yOf(hematocrit) + 4, `${fix(hematocrit)}%`, "vx-label vx-accent-text");
    out += text(
      lx + 6,
      Math.min(yOf((100 + hematocrit) / 2), yOf(hematocrit) - 26) + 4,
      "plasma",
      "vx-note",
    );
    out += text(lx + 6, yOf(hematocrit / 2) + 4, "red cells", "vx-note");
  } else {
    out += text(lx + 6, yOf(60), "settling…", "vx-note");
  }
  const sx = width < 420 ? 160 : 190;
  const size = Math.max(100, Math.min(width - sx - 4, 250));
  const sy = 30;
  out += text(sx, sy - 12, "sample, magnified", "vx-note");
  out += `<rect x="${sx}" y="${sy}" width="${p(size)}" height="${p(size)}" class="vx-sample"/>`;
  const count = Math.max(4, Math.round(rbc * 8));
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const random = rng(count * 31);
  const r = Math.sqrt(((hematocrit / 100) * size * size) / (count * Math.PI));
  const pale = clamp(0.62 - (mchc - 30) * 0.05, 0.18, 0.78);
  out += `<defs><clipPath id="vx-sample-clip"><rect x="${sx}" y="${sy}" width="${p(size)}" height="${p(size)}"/></clipPath></defs><g clip-path="url(#vx-sample-clip)">`;
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const row = Math.floor(i / cols);
    const cx = sx + ((c + 0.5 + (random() - 0.5) * 0.24) * size) / cols;
    const cy = sy + ((row + 0.5 + (random() - 0.5) * 0.24) * size) / rows;
    out += `<circle cx="${p(cx)}" cy="${p(cy)}" r="${p(r)}" class="vx-oxy-fill"/><circle cx="${p(cx)}" cy="${p(cy)}" r="${p(r * pale)}" class="vx-rbc-pale"/>`;
  }
  out += "</g>";
  out += text(sx, sy + size + 18, `about ${Math.round(hematocrit)}% of this`, "vx-note");
  out += text(sx, sy + size + 33, "square is red cell", "vx-note");
  return svg(
    width,
    Math.max(height, sy + size + 42),
    `A centrifuged blood tube with ${fix(hematocrit)}% red cells, a thin buffy coat, and plasma, beside a magnified sample in which red cells cover the same share of the area.`,
    out,
  );
}

/* ── Figure 4: the dissociation curve ────────────────────────────────── */

export function curveFacts({ po2, shifted }) {
  const lungs = severinghaus(100);
  const here = shifted ? saturation(po2, SHIFTED_P50) : severinghaus(po2);
  const normal = severinghaus(po2);
  return { lungs, here, normal, released: lungs - here, sites: Math.round(here * 48) };
}

export function renderCurve(state, width) {
  const { po2, shifted } = state;
  const wide = width >= 600;
  const chartW = wide ? width - 196 : width;
  const chartH = wide ? 310 : 280;
  const m = { l: 42, r: 12, t: 48, b: 40 };
  const x0 = m.l;
  const y0 = m.t;
  const w = chartW - m.l - m.r;
  const h = chartH - m.t - m.b;
  const xs = linear(0, 120, x0, x0 + w);
  const ys = linear(0, 1, y0 + h, y0);
  const facts = curveFacts(state);
  let out = frame({
    x0,
    y0,
    w,
    h,
    xs,
    ys,
    xTicks: [0, 20, 40, 60, 80, 100, 120],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    xFmt: (v) => String(v),
    yFmt: (v) => `${v * 100}%`,
    xTitle: "PO₂, mmHg",
    yTitle: "",
  });
  LANDMARKS.forEach(({ po2: value, name }, i) => {
    const x = xs(value);
    const ly = i === 2 ? y0 - 10 : y0 - 26;
    out += line(x, ly + 4, x, y0 + h, "vx-landmark");
    out += text(x, ly, name, "vx-note", `text-anchor="${value === 100 ? "end" : "middle"}"`);
  });
  for (const [value, percent] of STANDARD_CURVE)
    if (value <= 120)
      out += `<circle cx="${p(xs(value))}" cy="${p(ys(percent / 100))}" r="2.2" class="vx-data-dot"/>`;
  const sample = (fn) => {
    const points = [];
    for (let v = 0; v <= 120; v += 0.75) points.push([xs(v), ys(fn(v))]);
    return pathOf(points);
  };
  out += `<path d="${sample(severinghaus)}" class="vx-curve"/>`;
  if (shifted) {
    out += `<path d="${sample((v) => saturation(v, SHIFTED_P50))}" class="vx-curve-shifted"/>`;
    out += text(
      xs(36) + 6,
      ys(saturation(36, SHIFTED_P50)) + 14,
      "shifted",
      "vx-note vx-deoxy-text",
    );
  }
  const lx = xs(po2);
  out += line(xs(100), ys(facts.lungs), lx, ys(facts.lungs), "vx-guide-accent");
  out += `<line x1="${p(lx)}" y1="${p(ys(facts.lungs))}" x2="${p(lx)}" y2="${p(ys(facts.here))}" class="vx-released"/>`;
  if (facts.released > 0.04) {
    const label = `−${Math.round(facts.released * 100)} pts`;
    const right = po2 < 16;
    out += text(
      lx + (right ? 8 : -8),
      (ys(facts.lungs) + ys(facts.here)) / 2 + 4,
      label,
      "vx-label vx-accent-text",
      `text-anchor="${right ? "start" : "end"}"`,
    );
  }
  out += line(lx, ys(facts.here), lx, y0 + h, "vx-guide");
  out += `<circle cx="${p(lx)}" cy="${p(ys(facts.here))}" r="6" class="vx-handle"/>`;
  const legendX = x0 + w - 4;
  const legendY = y0 + h - (shifted ? 56 : 38);
  out += `<line x1="${p(legendX - 150)}" y1="${p(legendY)}" x2="${p(legendX - 132)}" y2="${p(legendY)}" class="vx-curve"/>`;
  out += text(legendX - 126, legendY + 4, "Severinghaus equation", "vx-note");
  out += `<circle cx="${p(legendX - 141)}" cy="${p(legendY + 18)}" r="2.2" class="vx-data-dot"/>`;
  out += text(legendX - 126, legendY + 22, "standard curve data", "vx-note");
  if (shifted) {
    out += `<line x1="${p(legendX - 150)}" y1="${p(legendY + 36)}" x2="${p(legendX - 132)}" y2="${p(legendY + 36)}" class="vx-curve-shifted"/>`;
    out += text(legendX - 126, legendY + 40, `P50 ${SHIFTED_P50} (illustrative)`, "vx-note");
  }
  // One red cell, twelve hemoglobin molecules, four sites each.
  const px = wide ? chartW + 8 : 0;
  const py = wide ? 30 : chartH + 6;
  const pw = wide ? 188 : width;
  const ccx = px + pw / 2;
  const ccy = py + 96;
  out += `<ellipse cx="${p(ccx)}" cy="${p(ccy)}" rx="86" ry="72" style="fill:${mix(facts.here)}" class="vx-cell-body"/>`;
  out += `<ellipse cx="${p(ccx)}" cy="${p(ccy)}" rx="62" ry="50" class="vx-cell-dimple"/>`;
  const order = [5, 2, 9, 0, 7, 11, 3, 8, 1, 10, 4, 6];
  let remaining = facts.sites;
  const full = new Array(12).fill(0);
  for (const index of order) {
    full[index] = Math.min(4, remaining);
    remaining -= full[index];
  }
  for (let i = 0; i < 12; i++) {
    const gx = ccx + ((i % 4) - 1.5) * 30;
    const gy = ccy + (Math.floor(i / 4) - 1) * 32;
    out += `<circle cx="${p(gx)}" cy="${p(gy)}" r="13" class="vx-globin"/>`;
    for (let s = 0; s < 4; s++) {
      const sx = gx + (s % 2 ? 5.5 : -5.5);
      const sy = gy + (s > 1 ? 5.5 : -5.5);
      out += `<circle cx="${p(sx)}" cy="${p(sy)}" r="4" class="${s < full[i] ? "vx-site-full" : "vx-site-empty"}"/>`;
    }
  }
  out += text(
    ccx,
    py + 188,
    `${facts.sites} of 48 sites hold O₂`,
    "vx-label",
    'text-anchor="middle"',
  );
  out += text(ccx, py + 204, "12 of ~300 million hemoglobins", "vx-note", 'text-anchor="middle"');
  return svg(
    width,
    wide ? chartH : chartH + 222,
    `Oxygen-hemoglobin dissociation curve. At ${po2} mmHg, hemoglobin is ${Math.round(facts.here * 100)}% saturated, having released ${Math.round(facts.released * 100)} percentage points since the lungs.`,
    out,
  );
}

/* ── Figure 5: oxygen content ────────────────────────────────────────── */

export function contentFacts({ hb }) {
  const arterial = oxygenContent(hb, severinghaus(100), 100);
  const venous = oxygenContent(hb, severinghaus(40), 40);
  const typical = oxygenContent(15, severinghaus(100), 100);
  return { arterial, venous, typical, delivered: arterial.total - venous.total };
}

export function renderContent({ hb }, width) {
  const facts = contentFacts({ hb });
  const typicalVenous = oxygenContent(15, severinghaus(40), 40);
  const narrow = width < 480;
  const x0 = narrow ? 92 : 128;
  const w = width - x0 - 14;
  const xs = linear(0, 28, x0, x0 + w);
  const rows = [
    {
      y: 26,
      name: "arterial",
      sub: "PO₂ 100 · 98%",
      value: facts.arterial,
      ghost: facts.typical,
      fill: "var(--vx-oxy)",
    },
    {
      y: 92,
      name: "venous",
      sub: "PO₂ 40 · 75%",
      value: facts.venous,
      ghost: typicalVenous,
      fill: mix(severinghaus(40)),
    },
  ];
  let out = "";
  for (const t of [0, 5, 10, 15, 20, 25]) {
    out += line(xs(t), 14, xs(t), 128, "vx-grid");
    out += text(xs(t), 146, String(t), "vx-tick", 'text-anchor="middle"');
  }
  out += text(x0 + w, 162, "mL O₂ per dL of blood", "vx-note", 'text-anchor="end"');
  for (const row of rows) {
    out += text(0, row.y + 12, row.name, "vx-label");
    out += text(0, row.y + 27, row.sub, "vx-tick");
    out += `<rect x="${x0}" y="${row.y}" width="${p(xs(row.value.bound) - x0)}" height="26" style="fill:${row.fill}"/>`;
    out += `<rect x="${p(xs(row.value.bound))}" y="${row.y}" width="${p(Math.max(1.5, xs(row.value.total) - xs(row.value.bound)))}" height="26" class="vx-dissolved"/>`;
    if (Math.abs(hb - 15) > 0.05)
      out += `<rect x="${x0}" y="${row.y - 3}" width="${p(xs(row.ghost.total) - x0)}" height="32" class="vx-ghost"/>`;
    out += text(xs(row.value.total) + 6, row.y + 17, fix(row.value.total), "vx-tick");
  }
  const by = 72;
  out += `<path d="M${p(xs(facts.venous.total))},${by - 5} V${by} H${p(xs(facts.arterial.total))} V${by - 5}" class="vx-delivered"/>`;
  out += text(
    (xs(facts.venous.total) + xs(facts.arterial.total)) / 2,
    by + 14,
    `delivered ${fix(facts.delivered)}`,
    "vx-note vx-accent-text",
    'text-anchor="middle"',
  );
  if (Math.abs(hb - 15) > 0.05)
    out += text(xs(facts.typical.total) + 4, 18, "at 15 g/dL", "vx-note vx-faint");
  return svg(
    width,
    170,
    `Oxygen content bars at ${fix(hb)} g/dL hemoglobin: arterial ${fix(facts.arterial.total)} and venous ${fix(facts.venous.total)} mL per dL.`,
    out,
  );
}

/* ── Figure 6: viscosity and hematocrit ──────────────────────────────── */

export function viscosityFacts({ hct, diameter }) {
  const viscosity = relativeViscosity(hct, diameter);
  const best = optimalHematocrit(diameter);
  const peak = oxygenTransport(best, diameter);
  return { viscosity, best, share: oxygenTransport(hct, diameter) / peak, atEdge: best >= 0.699 };
}

export function renderViscosity(state, width, t = 0) {
  const { hct, diameter } = state;
  const facts = viscosityFacts(state);
  const wide = width >= 600;
  let out = "";
  // Tube: cells at the chosen hematocrit move at a speed set by viscosity.
  const cy = 34;
  const half = 20;
  out += `<rect x="0" y="${cy - half - 4}" width="${width}" height="${(half + 4) * 2}" class="vx-externa-fill"/>`;
  out += `<rect x="0" y="${cy - half}" width="${width}" height="${half * 2}" class="vx-lumen-fill"/>`;
  const per = Math.round((hct * width) / 7);
  const random = rng(19);
  const speed = 110 / facts.viscosity;
  let cells = "";
  for (let i = 0; i < per; i++) {
    const x0 = random() * (width + 20);
    const y = cy + (random() * 2 - 1) * (half - 5);
    cells += redCell(mod(x0 + speed * t, width + 20) - 10, y, 5, 3.4, "var(--vx-oxy)");
  }
  out += motion(cells);
  out += line(width * 0.72, cy - half - 8, width * 0.72, cy + half + 8, "vx-count-line");
  const top = 82;
  const colW = wide ? Math.round(width * 0.56) : width;
  const x0 = 44;
  const w = colW - x0 - 12;
  const h = 128;
  const xs = linear(0.1, 0.7, x0, x0 + w);
  const yMax = Math.max(relativeViscosity(0.7, 1000), relativeViscosity(0.7, diameter)) * 1.05;
  const ysA = linear(0, yMax, top + h, top);
  const ticksA = yMax > 8 ? [0, 4, 8, 12] : [0, 2, 4, 6, 8].filter((v) => v <= yMax);
  out += frame({
    x0,
    y0: top,
    w,
    h,
    xs,
    ys: ysA,
    xTicks: [0.1, 0.3, 0.5, 0.7],
    yTicks: ticksA,
    xFmt: (v) => `${Math.round(v * 100)}%`,
    yFmt: String,
    yTitle: "viscosity, × plasma",
  });
  const sample = (fn, from = 0.1, to = 0.7) => {
    const points = [];
    for (let v = from; v <= to + 1e-9; v += 0.01) points.push([xs(v), fn(v)]);
    return pathOf(points);
  };
  if (Math.abs(diameter - 1000) > 1) {
    out += `<path d="${sample((v) => ysA(relativeViscosity(v, 1000)))}" class="vx-ref-line"/>`;
    out += text(
      xs(0.7),
      ysA(relativeViscosity(0.7, 1000)) - 6,
      "1 mm tube",
      "vx-note",
      'text-anchor="end"',
    );
  }
  out += `<path d="${sample((v) => ysA(relativeViscosity(v, diameter)))}" class="vx-curve-ink"/>`;
  out += line(xs(hct), top, xs(hct), top + h, "vx-guide");
  out += `<circle cx="${p(xs(hct))}" cy="${p(ysA(facts.viscosity))}" r="5" class="vx-handle"/>`;
  const topB = top + h + 62;
  const ysB = linear(0, 1, topB + h, topB);
  const peak = oxygenTransport(facts.best, diameter);
  out += frame({
    x0,
    y0: topB,
    w,
    h,
    xs,
    ys: ysB,
    xTicks: [0.1, 0.3, 0.5, 0.7],
    yTicks: [0, 0.5, 1],
    xFmt: (v) => `${Math.round(v * 100)}%`,
    yFmt: (v) => `${v * 100}%`,
    xTitle: "hematocrit",
    yTitle: "O₂ carried per unit pressure, vs peak",
  });
  out += `<path d="${sample((v) => ysB(oxygenTransport(v, diameter) / peak))}" class="vx-curve-accent"/>`;
  out += line(xs(facts.best), topB, xs(facts.best), topB + h, "vx-landmark");
  out += text(
    xs(facts.best) + (facts.best > 0.6 ? -4 : 4),
    topB + h - 8,
    `peak ${Math.round(facts.best * 100)}%`,
    "vx-note",
    `text-anchor="${facts.best > 0.6 ? "end" : "start"}"`,
  );
  out += line(xs(hct), topB, xs(hct), topB + h, "vx-guide");
  out += `<circle cx="${p(xs(hct))}" cy="${p(ysB(facts.share))}" r="5" class="vx-handle"/>`;
  // Viscosity across diameters at this hematocrit.
  const cx0 = wide ? colW + 44 : 44;
  const cTop = wide ? top : topB + h + 62;
  const cw = (wide ? width : width) - cx0 - 12;
  const ch = wide ? h * 2 + 62 : 150;
  const xd = logScale(5, 1000, cx0, cx0 + cw);
  const dMax = Math.max(relativeViscosity(hct, 1000), relativeViscosity(hct, 5)) * 1.12;
  const yd = linear(0, dMax, cTop + ch, cTop);
  out += frame({
    x0: cx0,
    y0: cTop,
    w: cw,
    h: ch,
    xs: xd,
    ys: yd,
    xTicks: [5, 10, 30, 100, 300, 1000],
    yTicks: dMax > 8 ? [0, 4, 8, 12] : [0, 1, 2, 3, 4, 5, 6, 7].filter((v) => v <= dMax),
    xFmt: String,
    yFmt: String,
    xTitle: "tube diameter, µm (log)",
    edges: true,
    yTitle: `viscosity at ${Math.round(hct * 100)}% hematocrit`,
  });
  const dPoints = [];
  for (let k = 0; k <= 120; k++) {
    const d = 5 * 200 ** (k / 120);
    dPoints.push([xd(d), yd(relativeViscosity(hct, d))]);
  }
  out += line(xd(8), cTop, xd(8), cTop + ch, "vx-landmark");
  out += text(xd(8) + 4, cTop + ch - 8, "≈ red cell", "vx-note");
  out += `<path d="${pathOf(dPoints)}" class="vx-curve-ink"/>`;
  out += `<circle cx="${p(xd(diameter))}" cy="${p(yd(facts.viscosity))}" r="5" class="vx-handle"/>`;
  return svg(
    width,
    cTop + ch + 40,
    `Blood viscosity and oxygen transport against hematocrit in a ${Math.round(diameter)} µm tube. At ${Math.round(hct * 100)}% hematocrit, viscosity is ${fix(facts.viscosity, 2)} times plasma; transport peaks at ${Math.round(facts.best * 100)}%.`,
    out,
  );
}

/* ── Figure 7: the capillary ─────────────────────────────────────────── */

export function capillaryFacts({ oncotic, arterial }) {
  const options = { arterial, venous: arterial - 17, oncotic };
  return {
    options,
    crossing: filtrationCrossing(options),
    start: netFiltration(0, options),
    end: netFiltration(1, options),
  };
}

export function renderCapillary(state, width, t = 0) {
  const { options, crossing } = capillaryFacts(state);
  const cy = 92;
  const lumen = 13;
  let out = "";
  const random = rng(23);
  for (const side of [-1, 1]) {
    for (let x = -10; x < width; x += 54) {
      const jitter = random() * 14;
      const y = side < 0 ? cy - 78 + random() * 6 : cy + 36 + random() * 6;
      out += `<rect x="${p(x + jitter)}" y="${p(y)}" width="44" height="34" rx="12" class="vx-tissue-cell"/>`;
    }
  }
  out += `<rect x="0" y="${cy - lumen - 3}" width="${width}" height="${(lumen + 3) * 2}" class="vx-capillary-wall"/>`;
  out += `<rect x="0" y="${cy - lumen}" width="${width}" height="${lumen * 2}" class="vx-lumen-fill"/>`;
  for (let x = 30; x < width; x += 62) {
    out += line(x, cy - lumen - 3, x, cy - lumen, "vx-junction");
    out += line(x + 31, cy + lumen, x + 31, cy + lumen + 3, "vx-junction");
  }
  const po2At = (x) => 100 - 60 * clamp(x / width, 0, 1);
  // Fluid: arrows along both walls, from net filtration pressure.
  for (let i = 0; i < 8; i++) {
    const fx = (i + 0.5) / 8;
    const x = fx * width;
    const nfp = netFiltration(fx, options);
    const length = Math.min(30, Math.abs(nfp) * 2.2);
    if (length < 2) continue;
    for (const side of [-1, 1]) {
      const wall = cy + side * (lumen + 5);
      const outward = nfp > 0;
      const y1 = outward ? wall : wall + side * length;
      const y2 = outward ? wall + side * length : wall;
      const dir = Math.sign(y2 - y1);
      out += `<path d="M${p(x)},${p(y1)} V${p(y2)} M${p(x - 3.5)},${p(y2 - dir * 4.5)} L${p(x)},${p(y2)} L${p(x + 3.5)},${p(y2 - dir * 4.5)}" class="vx-flux"/>`;
    }
  }
  // Gases: O2 leaves, CO2 enters.
  let moving = "";
  const gas = rng(41);
  for (let i = 0; i < 30; i++) {
    const x = gas() * width;
    const side = gas() < 0.5 ? -1 : 1;
    const phase = gas();
    const life = 3.4;
    const age = mod(t + phase * life, life) / life;
    const isO2 = i % 3 !== 0;
    const d = isO2 ? 15 + age * 52 : 67 - age * 52;
    const opacity = isO2 ? 1 - age : Math.min(1, age * 1.4) * (1 - age * 0.5);
    moving += `<circle cx="${p(x + age * 8)}" cy="${p(cy + side * d)}" r="${isO2 ? 2.6 : 2.2}" class="${isO2 ? "vx-o2" : "vx-co2"}" style="opacity:${p(opacity)}"/>`;
  }
  // Red cells: single file, folded, darkening as they unload.
  const spacing = 76;
  const count = Math.ceil(width / spacing) + 2;
  for (let k = 0; k < count; k++) {
    const x = mod(k * spacing + 24 * t, count * spacing) - spacing;
    if (x < -20 || x > width + 20) continue;
    const fill = mix(severinghaus(po2At(x)));
    moving += `<path d="M${p(x - 13)},${cy - 11} Q${p(x - 5)},${cy} ${p(x - 13)},${cy + 11} L${p(x + 5)},${cy + 11} Q${p(x + 16)},${cy + 11} ${p(x + 16)},${cy} Q${p(x + 16)},${cy - 11} ${p(x + 5)},${cy - 11} Z" class="vx-rbc-folded" style="fill:${fill}"/>`;
  }
  out += motion(moving);
  out += text(4, 12, "arteriole end", "vx-note");
  out += text(width - 4, 12, "venule end", "vx-note", 'text-anchor="end"');
  out += `<circle cx="10" cy="182" r="2.6" class="vx-o2"/>`;
  out += text(18, 186, "O₂ out", "vx-note");
  out += `<circle cx="74" cy="182" r="2.2" class="vx-co2"/>`;
  out += text(82, 186, "CO₂ in", "vx-note");
  out += `<path d="M144,186 V176 M140.5,180.5 L144,176 L147.5,180.5" class="vx-flux"/>`;
  out += text(152, 186, "net fluid", "vx-note");
  // Chart: pressures along the capillary.
  const top = 216;
  const x0 = 40;
  const w = width - x0 - 12;
  const h = 150;
  const xs = linear(0, 1, x0, x0 + w);
  const ys = linear(0, 50, top + h, top);
  out += frame({
    x0,
    y0: top,
    w,
    h,
    xs,
    ys,
    xTicks: [0, 0.5, 1],
    yTicks: [0, 10, 20, 30, 40, 50],
    xFmt: (v) => (v === 0 ? "arteriole end" : v === 1 ? "venule end" : "middle"),
    edges: true,
    yFmt: String,
    yTitle: "mmHg · classic Starling model",
  });
  const pressure = (x) => options.arterial + (options.venous - options.arterial) * x;
  const outPoly = [];
  const backPoly = [];
  for (let k = 0; k <= 100; k++) {
    const x = k / 100;
    const cp = pressure(x);
    outPoly.push([xs(x), ys(Math.max(cp, options.oncotic))]);
    backPoly.push([xs(x), ys(Math.min(cp, options.oncotic))]);
  }
  const base = (poly) =>
    pathOf([...poly, [xs(1), ys(options.oncotic)], [xs(0), ys(options.oncotic)]]) + "Z";
  out += `<path d="${base(outPoly)}" class="vx-area-out"/>`;
  out += `<path d="${base(backPoly)}" class="vx-area-back"/>`;
  out += line(xs(0), ys(options.oncotic), xs(1), ys(options.oncotic), "vx-oncotic");
  out += line(xs(0), ys(options.arterial), xs(1), ys(options.venous), "vx-curve-ink");
  out += text(xs(0) + 4, ys(options.arterial) - 8, "blood pressure in the capillary", "vx-note");
  out += text(
    xs(1) - 4,
    ys(options.oncotic) + (options.oncotic > options.venous ? -8 : 16),
    "oncotic pull of plasma proteins",
    "vx-note vx-plasma-text",
    'text-anchor="end"',
  );
  if (crossing !== null) {
    out += line(xs(crossing), top, xs(crossing), top + h, "vx-landmark");
    out += text(xs(crossing) + 4, top + h - 8, "balanced", "vx-note");
  }
  return svg(
    width,
    top + h + 28,
    `A capillary with red cells passing single file and releasing oxygen, and a chart of capillary blood pressure against plasma oncotic pressure along its length.`,
    out,
  );
}

/* ── Figure 8: white cells, platelets, and a breach ──────────────────── */

export const GUARD_STAGES = [
  {
    at: 0,
    name: "intact wall",
    note: "Endothelium lines the vessel, and platelets float past without sticking.",
  },
  {
    at: 1.2,
    name: "breach: vascular spasm",
    note: "Smooth muscle in the damaged wall contracts, narrowing the vessel.",
  },
  {
    at: 3,
    name: "platelet plug",
    note: "Platelets meet the exposed collagen, turn spiky and sticky, and pile up, helped by von Willebrand factor.",
  },
  {
    at: 7,
    name: "coagulation: fibrin mesh",
    note: "Clotting factors turn fibrinogen into threads of fibrin, a mesh that traps platelets and red cells.",
  },
  {
    at: 11,
    name: "sealed",
    note: "The clot holds while the wall repairs. Later, plasmin breaks the fibrin down (fibrinolysis).",
  },
];
export const GUARD_LOOP = 14;
export function guardStage(time) {
  return [...GUARD_STAGES].reverse().find((stage) => time >= stage.at) || GUARD_STAGES[0];
}
export function whiteCellStage(time) {
  if (time < 3) return "flowing";
  if (time < 6) return "rolling";
  if (time < 7) return "sticking";
  if (time < 9.5) return "squeezing through";
  return "crawling toward bacteria";
}

const fieldCache = new Map();
function dotField(x, y, size) {
  const key = `${x},${y},${size}`;
  if (!fieldCache.has(key)) fieldCache.set(key, buildDotField(x, y, size));
  return fieldCache.get(key);
}
function buildDotField(x, y, size) {
  const { red, white, platelets } = cellsPerMicroliter();
  const nRed = Math.round(red / white);
  const nPlatelets = Math.round(platelets / white);
  const slots = Math.ceil(Math.sqrt(nRed + nPlatelets + 1));
  const step = size / slots;
  const random = rng(5);
  const order = Array.from({ length: slots * slots }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let out = `<rect x="${x}" y="${y}" width="${p(size)}" height="${p(size)}" class="vx-sample"/>`;
  let white0 = null;
  order.slice(0, nRed + nPlatelets + 1).forEach((slot, i) => {
    const cx = x + ((slot % slots) + 0.5 + (random() - 0.5) * 0.3) * step;
    const cy = y + (Math.floor(slot / slots) + 0.5 + (random() - 0.5) * 0.3) * step;
    if (i === 0) white0 = [cx, cy];
    else if (i <= nPlatelets)
      out += `<circle cx="${p(cx)}" cy="${p(cy)}" r="${p(step * 0.22)}" class="vx-platelet"/>`;
    else out += `<circle cx="${p(cx)}" cy="${p(cy)}" r="${p(step * 0.3)}" class="vx-oxy-fill"/>`;
  });
  out += `<circle cx="${p(white0[0])}" cy="${p(white0[1])}" r="${p(step * 0.75)}" class="vx-wbc"/><circle cx="${p(white0[0])}" cy="${p(white0[1])}" r="${p(step * 1.9)}" class="vx-callout"/>`;
  return { out, nRed, nPlatelets };
}

function platelet(x, y, active, r = 3.2) {
  if (!active)
    return `<ellipse cx="${p(x)}" cy="${p(y)}" rx="${r}" ry="${p(r * 0.6)}" class="vx-platelet"/>`;
  const points = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.75 : r * 1.55;
    points.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return `<path d="${pathOf(points)}Z" class="vx-platelet is-active"/>`;
}

export function renderGuards({ time }, width) {
  const wide = width >= 600;
  const field = wide ? 210 : Math.min(width, 240);
  const { out: dots, nRed, nPlatelets } = dotField(0, 22, field);
  let out = text(0, 12, "one microliter, scaled to 1 white cell", "vx-note") + dots;
  out += text(
    0,
    field + 40,
    `1 white cell · ${nPlatelets} platelets · ${nRed} red cells`,
    "vx-note",
  );
  let scene = "";
  const sx = wide ? field + 28 : 0;
  const sy = wide ? 0 : field + 64;
  const sw = width - sx;
  const sh = 270;
  const t = clamp(time, 0, GUARD_LOOP);
  const ease = (a, b) => clamp((t - a) / (b - a), 0, 1);
  const smooth = (v) => v * v * (3 - 2 * v);
  const spasm = smooth(ease(1.2, 2.6)) * 12;
  const lumenTop = sy + 30 + spasm;
  const wallY = sy + 150 - spasm;
  const gapX = sx + sw * 0.3;
  const gap = smooth(ease(1, 1.6)) * 56;
  const exitX = sx + sw * 0.78;
  scene += `<defs><clipPath id="vx-scene-clip"><rect x="${sx}" y="${sy + 18}" width="${p(sw)}" height="${sh - 18}"/></clipPath></defs><g clip-path="url(#vx-scene-clip)">`;
  scene += `<rect x="${sx}" y="${p(wallY)}" width="${p(sw)}" height="${p(sy + sh - wallY)}" class="vx-tissue"/>`;
  scene += `<rect x="${sx}" y="${p(lumenTop - 12)}" width="${p(sw)}" height="12" class="vx-endothelium"/>`;
  scene += `<rect x="${sx}" y="${p(lumenTop)}" width="${p(sw)}" height="${p(wallY - lumenTop)}" class="vx-lumen-fill"/>`;
  // Exposed collagen beneath the breach.
  if (gap > 1)
    for (let k = 0; k < 4; k++) {
      const yy = wallY + 18 + k * 7;
      const pts = [];
      for (let x = gapX - 52; x <= gapX + 52; x += 4)
        pts.push([x, yy + Math.sin(x / 6 + k * 1.7) * 2.6]);
      scene += `<path d="${pathOf(pts)}" class="vx-collagen"/>`;
    }
  // Endothelial cells along the wall, parted at the breach.
  for (let x = sx - 30; x < sx + sw; x += 54) {
    let x0 = x;
    let x1 = x + 50;
    if (x1 > gapX - gap / 2 && x0 < gapX + gap / 2) {
      if (x0 + 25 < gapX) x1 = Math.min(x1, gapX - gap / 2);
      else x0 = Math.max(x0, gapX + gap / 2);
    }
    if (x1 - x0 > 4)
      scene += `<rect x="${p(x0)}" y="${p(wallY)}" width="${p(x1 - x0)}" height="12" rx="5" class="vx-endothelium"/>`;
  }
  scene += text(sx + 6, sy + sh - 10, "tissue", "vx-note");
  scene += text(sx + 6, lumenTop + 16, "vessel", "vx-note");
  // Bacteria in the tissue.
  const bx = exitX + 10;
  const by = wallY + 86;
  for (let k = 0; k < 6; k++) {
    const x = bx + (k % 3) * 15 - 14;
    const y = by + Math.floor(k / 3) * 12;
    scene += `<rect x="${p(x)}" y="${p(y)}" width="13" height="6" rx="3" class="vx-bacteria" transform="rotate(${k * 41} ${p(x + 6)} ${p(y + 3)})"/>`;
  }
  // Flowing red cells.
  const random = rng(77);
  for (let i = 0; i < 10; i++) {
    const y = lumenTop + 18 + random() * (wallY - lumenTop - 40);
    const x = mod(random() * sw + 52 * t, sw + 40) - 20;
    scene += redCell(sx + x, y, 9, 6, "var(--vx-oxy)");
  }
  // Platelets: flow in, stick to the collagen and each other, turn spiky.
  for (let i = 0; i < 27; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const target = [gapX - 26 + col * 6.5 + (row % 2) * 3, wallY + 10 - row * 8];
    const arrive = 3 + i * 0.15;
    const ahead = Math.max(0, arrive - t);
    const x = target[0] - 80 * ahead;
    const y = target[1] - Math.min(44, 18 * ahead);
    if (x < sx + 3) continue;
    scene += platelet(x, y, t >= arrive, 4.2);
  }
  // Fibrin threads across the plug, trapping red cells.
  for (let k = 0; k < 12; k++) {
    const grow = ease(7 + k * 0.28, 7.7 + k * 0.28);
    if (!grow) continue;
    const a = -1 + k * 0.19;
    const len = 76 * grow;
    const fx = gapX - 8 + (k % 4) * 5;
    const fy = wallY - 4 + (k % 3) * 5;
    scene += line(
      fx - (Math.cos(a) * len) / 2,
      fy - (Math.sin(a) * len) / 2,
      fx + (Math.cos(a) * len) / 2,
      fy + (Math.sin(a) * len) / 2,
      "vx-fibrin",
    );
  }
  for (let k = 0; k < 3; k++) {
    const arrive = 7.8 + k * 0.7;
    if (t < arrive - 1.5) continue;
    const x = gapX - 24 + k * 22 - Math.max(0, arrive - t) * 50;
    scene += redCell(x, wallY - 18 - (k % 2) * 6, 9, 6, "var(--vx-oxy)");
  }
  // A white cell rolls, sticks, squeezes between endothelial cells, and crawls toward bacteria.
  const r = 15;
  const wy = wallY - r - 1;
  const rollFrom = sx + sw * 0.42;
  let wx;
  let wyy = wy;
  let squeeze = 0;
  if (t < 3) wx = rollFrom + t * 10;
  else if (t < 6) wx = rollFrom + 30 + (t - 3) * ((exitX - rollFrom - 30) / 3);
  else wx = exitX;
  if (t >= 7 && t < 9.5) {
    squeeze = smooth(ease(7, 9.5));
    wyy = wy + squeeze * (2 * r + 14);
  } else if (t >= 9.5) {
    const crawl = smooth(ease(9.5, 12));
    wyy = wy + 2 * r + 14 + crawl * 30;
    wx = exitX + crawl * 6;
  }
  const flat = t >= 6 && t < 7 ? 0.8 : 1;
  const pinch = squeeze > 0 && squeeze < 1 ? 1 - Math.sin(squeeze * Math.PI) * 0.5 : 1;
  const tall = squeeze > 0 && squeeze < 1 ? 1 + Math.sin(squeeze * Math.PI) * 0.45 : 1;
  scene += `<g class="vx-wbc-group"><ellipse cx="${p(wx)}" cy="${p(wyy)}" rx="${p((r * pinch) / flat)}" ry="${p(r * tall * flat)}" class="vx-wbc"/>`;
  const spin = t < 6 ? t * 110 : 660;
  for (let k = 0; k < 3; k++) {
    const a = ((spin + k * 120) * Math.PI) / 180;
    scene += `<circle cx="${p(wx + Math.cos(a) * 5.5 * pinch)}" cy="${p(wyy + Math.sin(a) * 5.5 * tall)}" r="4.2" class="vx-nucleus"/>`;
  }
  scene += "</g></g>";
  const stage = guardStage(t);
  scene += text(sx + 4, sy + 12, stage.name, "vx-label vx-accent-text");
  scene += text(
    sx + sw - 4,
    sy + 12,
    `white cell: ${whiteCellStage(t)}`,
    "vx-note",
    'text-anchor="end"',
  );
  scene += text(
    sx + sw - 4,
    sy + sh + 16,
    "schematic, not to scale",
    "vx-note vx-faint",
    'text-anchor="end"',
  );
  out += motion(scene);
  return svg(
    width,
    Math.max(sy + sh + 20, field + 50),
    `One microliter of blood scaled to one white cell, ${nPlatelets} platelets and ${nRed} red cells; and a vessel breach at stage: ${stage.name}.`,
    out,
  );
}

/** The model value under a pointer, mirroring each renderer's layout; null outside a chart. */
export function pointerValue(kind, width, x, y) {
  const within = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round = (v, step) => Math.round(v / step) * step;
  if (kind === "curve") {
    const wide = width >= 600;
    const chartW = wide ? width - 196 : width;
    const chartH = wide ? 310 : 280;
    if (x > chartW || y > chartH) return null;
    return { po2: Math.round(within(((x - 42) / (chartW - 54)) * 120, 0, 120)) };
  }
  if (kind === "radius") {
    if (y < 150) return null;
    return { radius: round(within(0.5 + (x - 40) / (width - 54), 0.5, 1.5), 0.01) };
  }
  if (kind === "viscosity") {
    const wide = width >= 600;
    const colW = wide ? Math.round(width * 0.56) : width;
    const diameterTop = wide ? 82 : 82 + 128 + 62 + 128 + 62 - 12;
    if (y < 70) return null;
    if ((wide && x > colW + 20) || (!wide && y > diameterTop)) {
      const cx0 = wide ? colW + 44 : 44;
      const t = within((x - cx0) / (width - cx0 - 12), 0, 1);
      return { diameter: 5 * 200 ** t };
    }
    return { hct: round(within(0.1 + ((x - 44) / (colW - 56)) * 0.6, 0.1, 0.7), 0.01) };
  }
  if (kind === "content") {
    const x0 = width < 480 ? 92 : 128;
    const content = ((x - x0) / (width - x0 - 14)) * 28;
    return { hb: round(within((content - 0.3) / (1.34 * severinghaus(100)), 5, 20), 0.1) };
  }
  return null;
}

export const renderers = {
  circuit: renderCircuit,
  radius: renderRadius,
  tube: renderTube,
  curve: renderCurve,
  content: renderContent,
  viscosity: renderViscosity,
  capillary: renderCapillary,
  guards: renderGuards,
};

export { STANDARD_P50 };

/* ── Readouts: one or two sentences under each figure ────────────────── */

/** Wrap case-sensitive units and symbols so the site's lowercase style leaves them alone. */
export const k = (value) => `<span class="keep-case">${value}</span>`;
const pct = (value) => `${Math.round(value * 100)}%`;

const WALL_NOTES = {
  aorta: `An elastic artery, more than 10 ${k("mm")} across. Elastic fiber in its media stretches with each heartbeat and recoils between beats.`,
  arteries: `Muscular arteries are 0.1 to 10 ${k("mm")} across, with a thick media of smooth muscle and less elastic fiber.`,
  arterioles: `Lumens of 30 ${k("µm")} or less, with one or two layers of smooth muscle. This is where resistance is greatest.`,
  capillaries: `5 to 10 ${k("µm")} across. The wall is a single layer of endothelium on a basement membrane, which is why exchange happens here.`,
  venules: `8 to 100 ${k("µm")} across, with only a few muscle cells in the media, and no valves.`,
  veins: `Thin walls around wide, irregular lumens; the externa is usually the thickest layer. Many limb veins have valves.`,
  cavae: `The largest veins, returning blood to the heart. Together, the systemic veins hold about 64% of the blood.`,
};

export function readout(kind, state) {
  switch (kind) {
    case "circuit": {
      const facts = circuitFacts(state.level);
      const ratio = meanSpeed(CIRCUIT[0].area) / facts.speed;
      const speed = k(facts.speedLabel);
      const compare =
        facts.id === "aorta"
          ? "the fastest point in the circuit."
          : `${ratio >= 10 ? Math.round(ratio).toLocaleString("en-US") : fix(ratio)} times slower than in the aorta.`;
      return `<strong>${facts.name}</strong>: ${k(facts.areaLabel)} of total cross-section, so blood averages ${speed}, ${compare} ${WALL_NOTES[facts.id]}`;
    }
    case "radius": {
      const { flow, resistance } = poiseuille(state.radius);
      return `At ${pct(state.radius)} of its resting radius, the arteriole's resistance is ${fix(resistance, resistance < 10 ? 2 : 1)} times resting and its flow is ${pct(flow)} of resting, at the same pressure difference.`;
    }
    case "tube": {
      const { rbc, mcv, mch } = state;
      const { hematocrit, hemoglobin, mchc } = redCellIndices(state);
      const checks = [
        [k("RBC"), rbc, CBC_RANGES.rbc, ` million/${k("µL")}`],
        ["hematocrit", hematocrit, CBC_RANGES.hematocrit, "%"],
        ["hemoglobin", hemoglobin, CBC_RANGES.hemoglobin, ` ${k("g/dL")}`],
        [k("MCV"), mcv, CBC_RANGES.mcv, ` ${k("fL")}`],
        [k("MCH"), mch, CBC_RANGES.mch, ` ${k("pg")}`],
        [k("MCHC"), mchc, CBC_RANGES.mchc, ` ${k("g/dL")}`],
      ];
      const notes = checks
        .map(([name, value, range, unit]) => {
          const shown = Number(value.toFixed(2));
          if (Array.isArray(range)) {
            const [lo, hi] = range;
            if (shown < lo) return `${name} is below the ${lo}–${hi}${unit} range`;
            if (shown > hi) return `${name} is above the ${lo}–${hi}${unit} range`;
            return null;
          }
          const inside = (sex) => shown >= range[sex][0] && shown <= range[sex][1];
          if (inside("male") && inside("female")) return null;
          if (inside("male")) return `${name} is inside the male range but not the female one`;
          if (inside("female")) return `${name} is inside the female range but not the male one`;
          return `${name} is ${shown < range.female[0] ? "below" : "above"} both adult ranges`;
        })
        .filter(Boolean);
      const verdict = notes.length
        ? `Against the MedlinePlus adult reference ranges, ${notes.join("; ")}.`
        : "Every value is inside the MedlinePlus adult reference ranges, for both sexes where they differ.";
      const count = `${fix(rbc, 2)} million/${k("µL")}`;
      return `<span class="vx-math">hematocrit = ${count} × ${Math.round(mcv)} ${k("fL")} = ${fix(hematocrit)}%</span><span class="vx-math">hemoglobin = ${count} × ${fix(mch)} ${k("pg")} = ${fix(hemoglobin)} ${k("g/dL")}</span><span class="vx-math">${k("MCHC")} = ${fix(hemoglobin)} ${k("g/dL")} ÷ ${fix(hematocrit / 100, 3)} = ${fix(mchc)} ${k("g/dL")}</span>${verdict}`;
    }
    case "curve": {
      const facts = curveFacts(state);
      const shifted = state.shifted
        ? ` On the shifted curve it has let go of ${Math.round((facts.normal - facts.here) * 100)} more points than the standard curve would at the same ${k("PO₂")}.`
        : "";
      return `At ${Math.round(state.po2)} ${k("mmHg")}, hemoglobin is ${pct(facts.here)} saturated. It left the lungs ${pct(facts.lungs)} saturated, so it has released ${Math.max(0, Math.round(facts.released * 100))} percentage points of its oxygen.${shifted}`;
    }
    case "content": {
      const facts = contentFacts(state);
      const ratio = facts.arterial.total / facts.typical.total;
      const s = severinghaus(100);
      const comparison =
        Math.abs(state.hb - 15) > 0.05
          ? ` Saturation is still ${pct(s)}, so a pulse oximeter would read the same, but content is ${pct(ratio)} of what it is at 15 ${k("g/dL")}.`
          : "";
      return `<span class="vx-math">1.34 × ${fix(state.hb)} ${k("g/dL")} × ${fix(s, 3)} + 0.003 × 100 = ${fix(facts.arterial.total)} ${k("mL/dL")}</span>Each deciliter of arterial blood carries ${fix(facts.arterial.total)} ${k("mL")} of oxygen, ${fix(facts.arterial.dissolved)} of it dissolved. Resting tissue takes ${fix(facts.delivered)} ${k("mL")} of it.${comparison}`;
    }
    case "viscosity": {
      const facts = viscosityFacts(state);
      const tube = `${Math.round(state.diameter)} ${k("µm")} tube`;
      const peak = facts.atEdge
        ? `Oxygen carried per unit of pressure keeps rising all the way to 70%, the edge of this chart.`
        : `Oxygen carried per unit of pressure peaks at a hematocrit of ${pct(facts.best)}, and ${pct(state.hct)} gets ${pct(facts.share)} of that peak.`;
      return `At ${pct(state.hct)} hematocrit in a ${tube}, blood is ${fix(facts.viscosity, 2)} times as viscous as plasma. ${peak}`;
    }
    case "capillary": {
      const { crossing, start, end } = capillaryFacts(state);
      const pressures = `Capillary pressure falls from ${state.arterial} to ${state.arterial - 17} ${k("mmHg")} against an oncotic pull of ${state.oncotic} ${k("mmHg")}.`;
      if (crossing !== null)
        return `${pressures} In the classic model, fluid is pushed out along the first ${pct(crossing)} of the capillary and drawn back along the rest; net pressure runs from ${fix(start, 0)} to ${fix(end, 0)} ${k("mmHg")}.`;
      if (start > 0)
        return `${pressures} In the classic model, fluid is pushed out along the whole length and none is drawn back, so lymph has to carry it all away.`;
      return `${pressures} In the classic model, fluid is drawn in along the whole length.`;
    }
    case "guards": {
      const stage = guardStage(state.time);
      return `<strong>${stage.name}</strong>. ${stage.note} Meanwhile the white cell is ${whiteCellStage(state.time)}.`;
    }
    default:
      return "";
  }
}
