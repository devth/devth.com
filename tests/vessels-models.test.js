import { it, expect } from "vite-plus/test";
import {
  severinghaus,
  saturation,
  STANDARD_P50,
  STANDARD_CURVE,
  oxygenContent,
  redCellIndices,
  poiseuille,
  relativeViscosity,
  optimalHematocrit,
  CIRCUIT,
  CARDIAC_FLOW,
  meanSpeed,
  netFiltration,
  filtrationCrossing,
  filtrationBalance,
  cellsPerMicroliter,
} from "../src/vessels-models.js";

it("matches Severinghaus's standard dissociation table within his stated ±0.0055", () => {
  for (const [po2, percent] of STANDARD_CURVE) {
    expect(Math.abs(severinghaus(po2) - percent / 100)).toBeLessThanOrEqual(0.0056);
  }
  expect(severinghaus(STANDARD_P50)).toBeCloseTo(0.5, 3);
  expect(severinghaus(0)).toBe(0);
});

it("gives the textbook arterial and resting venous saturations", () => {
  expect(severinghaus(100)).toBeGreaterThan(0.97);
  expect(severinghaus(40)).toBeCloseTo(0.75, 2);
});

it("shifts the curve right without changing its shape", () => {
  expect(saturation(32, 32)).toBeCloseTo(0.5, 3);
  expect(saturation(20, 32)).toBeLessThan(severinghaus(20));
  expect(saturation(40, STANDARD_P50)).toBeCloseTo(severinghaus(40), 12);
});

it("computes oxygen content near 20 mL/dL for normal arterial blood", () => {
  const arterial = oxygenContent(15, severinghaus(100), 100);
  expect(arterial.total).toBeGreaterThan(19.5);
  expect(arterial.total).toBeLessThan(20.5);
  expect(arterial.dissolved).toBeCloseTo(0.3, 5);
  const anemic = oxygenContent(8, severinghaus(100), 100);
  expect(anemic.total / arterial.total).toBeCloseTo(8.3 / 15.3, 1);
});

it("derives hematocrit, hemoglobin and MCHC from count, size and content", () => {
  const indices = redCellIndices({ rbc: 5, mcv: 90, mch: 30 });
  expect(indices.hematocrit).toBeCloseTo(45, 10);
  expect(indices.hemoglobin).toBeCloseTo(15, 10);
  expect(indices.mchc).toBeCloseTo(33.33, 2);
});

it("scales flow with the fourth power of radius", () => {
  expect(poiseuille(0.5).flow).toBeCloseTo(1 / 16, 10);
  expect(poiseuille(0.5).resistance).toBeCloseTo(16, 10);
  expect(poiseuille(2).flow).toBe(16);
});

it("reproduces the Pries viscosity law's anchors and the Fåhræus–Lindqvist effect", () => {
  expect(relativeViscosity(0.45, 1000)).toBeCloseTo(3.19, 2);
  expect(relativeViscosity(0, 100)).toBeCloseTo(1, 10);
  // Secomb & Pries: viscosity at 40 µm is about 60% of its value at 300 µm.
  const ratio = relativeViscosity(0.45, 40) / relativeViscosity(0.45, 300);
  expect(ratio).toBeGreaterThan(0.55);
  expect(ratio).toBeLessThan(0.7);
  let minimum = 3;
  for (let d = 3; d <= 40; d += 0.1)
    if (relativeViscosity(0.45, d) < relativeViscosity(0.45, minimum)) minimum = d;
  expect(minimum).toBeGreaterThan(5);
  expect(minimum).toBeLessThan(9);
});

it("finds a broad oxygen-transport optimum near 40% hematocrit in large tubes", () => {
  const best = optimalHematocrit(1000);
  expect(best).toBeGreaterThan(0.35);
  expect(best).toBeLessThan(0.45);
});

it("recovers Guyton's capillary speed and a 5 L/min output from aortic values", () => {
  expect((CARDIAC_FLOW * 60) / 1000).toBeCloseTo(4.95, 2);
  const capillaries = CIRCUIT.find((level) => level.id === "capillaries");
  expect(meanSpeed(capillaries.area) * 10).toBeCloseTo(0.33, 2); // mm/s
  expect(meanSpeed(CIRCUIT[0].area)).toBeCloseTo(33, 10);
});

it("matches OpenStax's net filtration pressures along a capillary", () => {
  expect(netFiltration(0)).toBe(10);
  expect(netFiltration(1)).toBe(-7);
  expect(filtrationCrossing()).toBeCloseTo(10 / 17, 10);
  expect(filtrationCrossing({ oncotic: 15 })).toBeNull();
  const { out, back } = filtrationBalance();
  expect(out).toBeGreaterThan(back);
});

it("keeps blood cell proportions from reference midpoints", () => {
  const cells = cellsPerMicroliter();
  expect(Math.round(cells.red / cells.white)).toBe(671);
  expect(Math.round(cells.platelets / cells.white)).toBe(35);
});
