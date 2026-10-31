import { it, expect, vi } from "vite-plus/test";

// A short strut followed by a deliberately slow one isolates replacement from
// completion. Mock the normal grammar boundary, not the production scheduler.
vi.mock("../src/growth-grammar.js", () => ({
  ornamentCurves: () => [],
  createGrowthGrammar: () => ({
    maxUnitCurves: 64,
    roots: 1,
    initialDelay: 0,
    birthInterval: () => 0.05,
    speed: () => 60,
    initialAngle: () => 0,
    unit: ({ point }) => {
      const middle = [point[0] + 1, point[1], point[2]];
      const end = [point[0] + 101, point[1], point[2]];
      return {
        curves: [
          [point, middle],
          [middle, end],
        ].map(([start, end]) => ({
          start,
          control: start.map((value, axis) => (value + end[axis]) / 2),
          end,
        })),
        exit: end,
      };
    },
    decorate: () => [],
    length: ({ start, end }) => Math.hypot(...end.map((value, axis) => value - start[axis])),
  }),
}));
import { createGrowth } from "../src/organic-growth.js";

it("removes an unfinished unit when its only live tip is replaced", () => {
  const growth = createGrowth("sigil", 4);
  for (let tick = 0; tick < 120; tick++) growth.advance(1 / 60);
  const drawing = growth.frame();
  expect(drawing.roots).toBeGreaterThan(20);
  expect(drawing.tips).toBe(8);
  // No tip survives long enough to finish its second strut. Only the first
  // strut plus the currently drawing second one may remain for each live tip.
  expect(drawing.segments).toBeLessThanOrEqual(drawing.tips * 2);
  const paused = growth.frame();
  expect(growth.frame(0).segments).toBe(0);
  expect(growth.frame()).toEqual(paused);
});
