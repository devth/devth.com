import { it, expect } from "vite-plus/test";
import { ornamentCurves } from "../src/organic-growth.js";

function randomSource(seed) {
  let state = seed;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const shape = (seed) => ornamentCurves([0, 0, 0], 0, 40, randomSource(seed));

it("generates reproducible node-specific forms without a shared blossom template", () => {
  expect(shape(123)).toEqual(shape(123));
  expect(shape(124)).not.toEqual(shape(123));
  const random = randomSource(71);
  const signatures = new Set();
  const topologies = new Set();
  const armCounts = new Set();
  for (let sample = 0; sample < 256; sample++) {
    const center = [0, 0, 0];
    const curves = ornamentCurves(center, 0, 40, random);
    const lengths = curves.map(({ start, end }) =>
      Math.hypot(end[0] - start[0], end[1] - start[1]),
    );
    const longest = Math.max(...lengths);
    // Ignore rotation, uniform scaling and drawing order: actual proportions
    // and topology must differ, not merely placement of the same stamped icon.
    signatures.add(
      lengths
        .map((length) => (length / longest).toFixed(4))
        .sort()
        .join(","),
    );
    const arms = curves.filter((curve) => curve.start === center).length;
    const closed = curves.filter((curve) => curve.end === center).length;
    armCounts.add(arms);
    topologies.add(`${arms}:${closed}:${curves.length}`);
    expect(curves.length).toBeGreaterThanOrEqual(2);
    expect(curves.length).toBeLessThanOrEqual(24);
    for (const curve of curves)
      for (const point of [curve.start, curve.control, curve.end]) {
        expect(point.every(Number.isFinite)).toBe(true);
        expect(Math.hypot(...point)).toBeLessThan(100);
      }
  }
  expect(signatures.size).toBe(256);
  expect(topologies.size).toBeGreaterThan(30);
  expect(armCounts.size).toBeGreaterThanOrEqual(5);
});

it("attaches to the branch node without changing the source point", () => {
  const point = [100, -50, 8];
  const curves = ornamentCurves(point, 1.4, 30, randomSource(39));
  expect(point).toEqual([100, -50, 8]);
  const connected = new Set([point]);
  for (const { start, end } of curves) {
    expect(connected.has(start)).toBe(true);
    connected.add(end);
  }
});
