import { it, expect } from "vite-plus/test";
import { alphaContours, strokeTrace, strokePlan } from "../src/logo-geometry.js";

it("traces actual alpha boundaries including the transparent counter, not a bounding rectangle", () => {
  const alpha = Uint8Array.from({ length: 24 * 24 }, (_, i) => {
    const x = i % 24,
      y = Math.floor(i / 24);
    return x > 2 && x < 21 && y > 2 && y < 21 && !(x > 8 && x < 15 && y > 8 && y < 15) ? 255 : 0;
  });
  const loops = alphaContours(alpha, 24, 24);
  expect(loops).toHaveLength(2);
  expect(loops.every((loop) => loop.length > 3 && loop.flat().every(Number.isFinite))).toBe(true);
  expect(alphaContours(new Uint8Array(64), 8, 8)).toEqual([]);
});

it("keeps loops closed when antialiased font pixels equal the threshold", () => {
  const alpha = Uint8Array.from({ length: 16 * 16 }, (_, i) => {
    const x = i % 16,
      y = Math.floor(i / 16);
    return x > 2 && x < 13 && y > 2 && y < 13 ? 128 : 0;
  });
  expect(alphaContours(alpha, 16, 16)).toHaveLength(1);
});

it("builds one finite continuous wrap that clears the actual shallow solid on both sides", () => {
  const sample = (x, y) => {
    if (y < -30 || y > 120) return null;
    const distance = Math.abs(x - 30) - 10;
    return { distance, nx: x < 30 ? -1 : 1, ny: 0 };
  };
  const trace = strokeTrace([48, 0], Math.PI, sample, 6, 22);
  expect(trace.length).toBeGreaterThan(100);
  expect(trace.length).toBeLessThanOrEqual(1024);
  expect(trace[0]).toEqual([48, 0, 2.5]);
  expect(trace.flat().every(Number.isFinite)).toBe(true);
  expect(Math.max(...trace.map((p) => p[2]))).toBeGreaterThan(2);
  expect(Math.min(...trace.map((p) => p[2]))).toBeLessThan(-8);
  for (let i = 1; i < trace.length; i++) {
    expect(Math.hypot(...trace[i].map((v, axis) => v - trace[i - 1][axis]))).toBeLessThan(8);
    const [x, y, z] = trace[i];
    if (z >= -6 && z <= 0) expect(sample(x, y).distance).toBeGreaterThanOrEqual(2);
  }
  expect(strokeTrace([0, 0], 0, () => null, 6, 22)).toEqual([]);
});

it("admits complete connected solid wraps without changing the incoming XYZ point", () => {
  const sample = (x, y) => ({
    distance: Math.max(Math.abs(x) - 5, Math.abs(y) - 80),
    nx: Math.sign(x) || 1,
    ny: 0,
  });
  const point = [20, 0, -1],
    plan = strokePlan(point, Math.PI, sample, 8, 8, [0, 0], 1, 7);
  expect(plan.curves).toHaveLength(7);
  expect(plan.curves[0].start).toEqual(point);
  plan.curves.forEach((curve, index) => {
    expect([curve.start, curve.control, curve.end].flat().every(Number.isFinite)).toBe(true);
    if (index) expect(curve.start).toEqual(plan.curves[index - 1].end);
  });
  expect(plan.exit).toEqual(plan.curves.at(-1).end);
  expect(strokePlan(point, Math.PI, sample, 8, 8, [0, 0], 1, 6)).toBeNull();
  expect(strokePlan([20, 0, 20], Math.PI, sample, 8, 8, [0, 0], 1, 7)).toBeNull();
});
