import { it, expect } from "vite-plus/test";
import { studies } from "../src/hover-studies.js";
import { createGrowth, organicCurves } from "../src/organic-growth.js";

const layers = ({ back, front, accent }) => back + front + accent;
const chunks = (drawing) => layers(drawing).match(/M[^M]+/g) || [];
function advance(growth, seconds, step = 1 / 30, bounds) {
  for (let tick = 0; tick < Math.round(seconds / step); tick++) growth.advance(step, bounds);
  return growth.frame();
}

it("grows reproducible seed-specific roots for all 15 profiles without shared mutable state", () => {
  const shapes = [];
  for (const { id } of studies) {
    const first = createGrowth(id, 123);
    expect(first.frame().segments).toBe(0);
    const frame = advance(first, 3);
    expect(frame).toEqual(advance(createGrowth(id, 123), 3));
    expect(frame).not.toEqual(advance(createGrowth(id, 124), 3));
    const snapshot = first.frame();
    advance(createGrowth("storm", -1), 10);
    expect(first.frame()).toEqual(snapshot);
    shapes.push(layers(frame));
  }
  expect(new Set(shapes).size).toBe(15);
});

it("sprouts new roots continually, including after the live detail budget matures", () => {
  for (const { id } of studies) {
    const growth = createGrowth(id, 7);
    const early = advance(growth, 1);
    const mature = advance(growth, 9);
    const late = advance(growth, 30);
    expect(mature.roots).toBeGreaterThan(early.roots);
    expect(late.roots).toBeGreaterThan(mature.roots);
    expect(late.tips).toBeGreaterThan(0);
    expect(late.tips).toBeLessThanOrEqual(24);
    expect(late.segments).toBeGreaterThan(600);
    expect(layers(late)).not.toEqual(layers(mature));
  }
});

it("retains existing wood at exactly its original scale instead of stretching it", () => {
  for (const { id } of studies) {
    const growth = createGrowth(id, 13);
    const early = chunks(advance(growth, 0.5));
    const later = new Set(chunks(advance(growth, 0.5)));
    expect(early.filter((segment) => later.has(segment)).length).toBeGreaterThan(early.length / 2);
    const late = advance(growth, 30);
    for (const segment of chunks(late)) {
      const points = segment.match(/-?\d+(?:\.\d+)?/g).map(Number);
      expect(Math.hypot(points[4] - points[0], points[5] - points[1])).toBeLessThan(100);
      expect(Math.hypot(points[2] - points[0], points[3] - points[1])).toBeLessThan(100);
    }
  }
});

it("bounds geometry and serialization during long runs and replenishes visible branch nodes", () => {
  const bounds = { left: -180, right: 500, top: -300, bottom: 500 };
  for (const { id } of studies) {
    const growth = createGrowth(id, 19);
    for (let sample = 0; sample < 6; sample++) {
      const frame = advance(growth, 10, 1 / 30, bounds);
      expect(frame.segments).toBeGreaterThan(0);
      expect(frame.segments).toBeLessThanOrEqual(680);
      expect(chunks(frame)).toHaveLength(frame.segments);
      expect(layers(frame)).not.toMatch(/NaN|Infinity|undefined/);
      expect(layers(frame).length).toBeLessThan(65000);
      expect(Number.isFinite(frame.extent)).toBe(true);
      expect(frame.extent).toBeLessThan(1300);
    }
  }
});

it("uses fixed simulation steps and does not mutate when merely rendering or paused", () => {
  expect(advance(createGrowth("mycelium", 2), 3, 1 / 30)).toEqual(
    advance(createGrowth("mycelium", 2), 3, 1 / 60),
  );
  const growth = createGrowth("bramble", 4);
  const before = advance(growth, 1);
  for (const value of [-1, 0, NaN, Infinity, -Infinity]) growth.advance(value);
  expect(growth.frame()).toEqual(before);
  growth.advance(Number.MAX_VALUE);
  expect(growth.frame().roots).toBeLessThan(before.roots + 2);
  expect(layers(growth.frame())).not.toMatch(/NaN|Infinity/);
  expect(() => createGrowth("missing")).toThrow(RangeError);
});

it("preserves the static study generator's smooth rolling generation boundaries", () => {
  for (const { id } of studies) {
    const before = organicCurves(id, 6 - 0.00001, 23);
    const after = organicCurves(id, 6 + 0.00001, 23);
    for (let index = 0; index < 100; index++) {
      for (const point of ["start", "control", "end"]) {
        before[index][point].forEach((value, axis) =>
          expect(Math.abs(value - after[index][point][axis])).toBeLessThan(0.01),
        );
      }
    }
  }
});
