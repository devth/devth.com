import { it, expect } from "vite-plus/test";
import { studies } from "../src/hover-studies.js";
import { growthFrame, organicCurves } from "../src/organic-growth.js";

const layers = ({ back, front, accent }) => back + front + accent;
const coordinates = (frame) =>
  [...layers(frame).matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)].map(([value]) => Number(value));

it("grows every study from an empty seed with reproducible, seed-specific personality", () => {
  const shapes = [];
  for (const { id } of studies) {
    expect(growthFrame(id, 0)).toEqual({ back: "", front: "", accent: "", extent: 0, segments: 0 });
    const frame = growthFrame(id, 3, 123);
    expect(frame).toEqual(growthFrame(id, 3, 123));
    expect(frame).not.toEqual(growthFrame(id, 3, 124));
    expect(growthFrame(id, 3)).toEqual(growthFrame(id, 3, 0));
    // Interleaved calls cannot mutate previously generated paths or RNG state.
    growthFrame("storm", 100, -9);
    expect(frame).toEqual(growthFrame(id, 3, 123));
    shapes.push(layers(frame));
  }
  expect(new Set(shapes).size).toBe(15);
});

it("rapidly increases reach and real curve/leaf detail during the first five seconds", () => {
  for (const { id } of studies) {
    const frames = [0, 0.1, 0.5, 2, 5].map((age) => growthFrame(id, age, 7));
    for (let index = 1; index < frames.length; index++) {
      expect(frames[index].extent).toBeGreaterThan(frames[index - 1].extent);
      expect(frames[index].segments).toBeGreaterThan(frames[index - 1].segments);
    }
    expect(frames[2].extent).toBeLessThan(64);
    expect(frames[3].extent).toBeGreaterThan(300);
    expect(frames[4].extent).toBeGreaterThan(1000);
    for (const frame of frames.slice(1)) {
      expect((layers(frame).match(/Q/g) || []).length).toBe(frame.segments);
      expect(Math.max(...coordinates(frame).map(Math.abs))).toBeLessThanOrEqual(
        frame.extent + 0.01,
      );
    }
  }
});

it("keeps active output bounded while rolling generations and extent continue growing", () => {
  for (const { id } of studies) {
    let previousExtent = 0;
    for (const age of [10, 60, 3600, 1e6, 1e12, 1e100, Number.MAX_VALUE]) {
      const frame = growthFrame(id, age, 19);
      expect(frame.segments).toBeGreaterThan(0);
      expect(frame.segments).toBeLessThanOrEqual(700);
      expect(organicCurves(id, age, 19)).toHaveLength(frame.segments);
      expect(layers(frame)).not.toMatch(/NaN|Infinity|undefined/);
      expect(coordinates(frame).every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(frame.extent)).toBe(true);
      expect(frame.extent).toBeGreaterThan(previousExtent);
      // A fixed detail budget also bounds serialized output, including huge values.
      expect(layers(frame).length).toBeLessThan(150000);
      previousExtent = frame.extent;
    }
    expect(growthFrame(id, 3600).extent).toBeGreaterThan(growthFrame(id, 60).extent);
    // Different generations must change topology, not merely scale the same tree.
    expect(organicCurves(id, 60, 19)).not.toEqual(organicCurves(id, 66, 19));
  }
});

it("crosses rolling generations without replacing the plant in a single frame", () => {
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

it("handles invalid ages without nonfinite geometry and rejects unsupported IDs explicitly", () => {
  for (const age of [-1, NaN, Infinity, -Infinity]) {
    expect(growthFrame("mycelium", age)).toEqual(growthFrame("mycelium", 0));
  }
  expect(() => growthFrame("missing", 2)).toThrow(RangeError);
});
