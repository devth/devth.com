// Pure models behind the /vessels figures. Every figure computes its values
// from these functions; sources are listed in docs/vessels-ledger.md.

/** Severinghaus (1979) fit to the standard human O2 dissociation curve, 37 °C, pH 7.4. */
export function severinghaus(po2) {
  if (!(po2 > 0)) return 0;
  return 1 / (23400 / (po2 ** 3 + 150 * po2) + 1);
}

/** P50 of the Severinghaus equation (mmHg), reported in the paper as 26.86. */
export const STANDARD_P50 = 26.86;

/**
 * Saturation on a curve shifted to another P50. Scaling PO2 keeps the curve's
 * shape and moves it sideways: an illustration of a Bohr shift, not a fit.
 */
export function saturation(po2, p50 = STANDARD_P50) {
  return severinghaus((po2 * STANDARD_P50) / p50);
}

/** Severinghaus 1979 (rev. 2007) Table 1: standard curve, PO2 mmHg → % saturation. */
export const STANDARD_CURVE = [
  [1, 0.6],
  [2, 1.19],
  [4, 2.56],
  [6, 4.37],
  [8, 6.68],
  [10, 9.58],
  [12, 12.96],
  [14, 16.89],
  [16, 21.4],
  [18, 26.5],
  [20, 32.12],
  [22, 37.6],
  [24, 43.14],
  [26, 48.27],
  [28, 53.16],
  [30, 57.54],
  [32, 61.69],
  [34, 65.16],
  [36, 68.63],
  [38, 71.94],
  [40, 74.69],
  [42, 77.29],
  [44, 79.55],
  [46, 81.71],
  [48, 83.52],
  [50, 85.08],
  [52, 86.59],
  [54, 87.7],
  [56, 88.93],
  [58, 89.95],
  [60, 90.85],
  [65, 92.73],
  [70, 94.06],
  [75, 95.1],
  [80, 95.84],
  [85, 96.42],
  [90, 96.88],
  [95, 97.25],
  [100, 97.49],
  [110, 97.91],
  [120, 98.21],
];

/** Oxygen content in mL O2 per dL blood: 1.34 mL per g of saturated Hb, 0.003 mL/dL/mmHg dissolved. */
export function oxygenContent(hb, so2, po2) {
  const bound = 1.34 * hb * so2;
  const dissolved = 0.003 * po2;
  return { bound, dissolved, total: bound + dissolved };
}

/**
 * Red-cell indices. rbc in million cells/µL, mcv in fL, mch in pg.
 * Hct (%) = RBC × MCV / 10; Hb (g/dL) = RBC × MCH / 10; MCHC (g/dL) = Hb / Hct × 100.
 */
export function redCellIndices({ rbc, mcv, mch }) {
  const hematocrit = (rbc * mcv) / 10;
  const hemoglobin = (rbc * mch) / 10;
  return { hematocrit, hemoglobin, mchc: (hemoglobin / hematocrit) * 100 };
}

/** MedlinePlus CBC reference ranges (adults); labs vary. */
export const CBC_RANGES = {
  rbc: { male: [4.6, 6.2], female: [4.2, 5.4] },
  hematocrit: { male: [40, 55], female: [36, 48] },
  hemoglobin: { male: [13, 18], female: [12, 16] },
  mcv: [80, 100],
  mch: [27, 32],
  mchc: [32, 36],
  wbc: [4500, 11000],
  platelets: [150000, 400000],
};

/** Poiseuille: at a fixed pressure difference, flow ∝ r⁴ and resistance ∝ 1/r⁴. */
export function poiseuille(radiusRatio) {
  const flow = radiusRatio ** 4;
  return { flow, resistance: 1 / flow };
}

/**
 * Relative apparent viscosity of blood in glass tubes (Pries, Neuhaus &
 * Gaehtgens 1992), as restated by Secomb & Pries 2011. hd is discharge
 * hematocrit (0–1), diameter in µm.
 */
export function relativeViscosity(hd, diameter) {
  const d = diameter;
  const mu45 = 220 * Math.exp(-1.3 * d) + 3.2 - 2.44 * Math.exp(-0.06 * d ** 0.645);
  const shape = 1 / (1 + 1e-11 * d ** 12);
  const c = (0.8 + Math.exp(-0.075 * d)) * (-1 + shape) + shape;
  return 1 + ((mu45 - 1) * ((1 - hd) ** c - 1)) / ((1 - 0.45) ** c - 1);
}

/** Red cells delivered per unit pressure: hematocrit × flow, with flow ∝ 1/viscosity. */
export function oxygenTransport(hd, diameter) {
  return hd / relativeViscosity(hd, diameter);
}

/** Hematocrit (0–1) that maximizes oxygenTransport for a tube diameter, on a 0.001 grid. */
export function optimalHematocrit(diameter, from = 0.1, to = 0.7) {
  let best = from;
  let bestValue = -Infinity;
  for (let h = from; h <= to + 1e-9; h += 0.001) {
    const value = oxygenTransport(h, diameter);
    if (value > bestValue) {
      bestValue = value;
      best = h;
    }
  }
  return best;
}

/**
 * Guyton & Hall's total cross-sectional areas of the systemic circulation (cm²).
 * Speeds follow from continuity: the same flow crosses every level.
 */
export const CIRCUIT = [
  { id: "aorta", name: "aorta", area: 2.5 },
  { id: "arteries", name: "small arteries", area: 20 },
  { id: "arterioles", name: "arterioles", area: 40 },
  { id: "capillaries", name: "capillaries", area: 2500 },
  { id: "venules", name: "venules", area: 250 },
  { id: "veins", name: "small veins", area: 80 },
  { id: "cavae", name: "venae cavae", area: 8 },
];
export const AORTIC_SPEED = 33; // cm/s, Guyton & Hall
export const CARDIAC_FLOW = CIRCUIT[0].area * AORTIC_SPEED; // cm³/s

/** Mean speed in cm/s for a total cross-sectional area in cm². */
export function meanSpeed(area, flow = CARDIAC_FLOW) {
  return flow / area;
}

/**
 * Classic Starling net filtration pressure along a capillary (x from 0 at the
 * arteriolar end to 1 at the venular end). Capillary pressure falls linearly;
 * interstitial pressures are taken as negligible, as in OpenStax 20.3.
 */
export function netFiltration(x, { arterial = 35, venous = 18, oncotic = 25 } = {}) {
  return arterial + (venous - arterial) * x - oncotic;
}

/** Where net filtration crosses zero (0–1), or null if it never does. */
export function filtrationCrossing(options = {}) {
  const start = netFiltration(0, options);
  const end = netFiltration(1, options);
  if (start === end) return null;
  const x = start / (start - end);
  return x > 0 && x < 1 ? x : null;
}

/** Areas of outward (filtration) and inward (reabsorption) pressure along the capillary. */
export function filtrationBalance(options = {}, steps = 400) {
  let out = 0;
  let back = 0;
  for (let i = 0; i < steps; i++) {
    const value = netFiltration((i + 0.5) / steps, options) / steps;
    if (value > 0) out += value;
    else back -= value;
  }
  return { out, back };
}

/** Midpoints of the MedlinePlus ranges: cells per µL. */
export function cellsPerMicroliter() {
  const mid = ([a, b]) => (a + b) / 2;
  return {
    red: mid([CBC_RANGES.rbc.female[0], CBC_RANGES.rbc.male[1]]) * 1e6,
    white: mid(CBC_RANGES.wbc),
    platelets: mid(CBC_RANGES.platelets),
  };
}
