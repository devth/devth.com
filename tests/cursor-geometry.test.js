import { describe, it, expect } from "vitest";
import { cursorPath } from "../src/cursor-geometry.js";

describe("morphing cursor geometry", () => {
  it("draws distinct wireframe solids with twelve finite segments inside the hotspot box", () => {
    const shapes = new Set();
    for (let index = 0; index < 400; index++) {
      const path = cursorPath(index / 100);
      expect(path.match(/M/g)).toHaveLength(12);
      expect(path.match(/L/g)).toHaveLength(12);
      for (const coordinate of path.match(/-?\d+(?:\.\d+)?/g).map(Number)) {
        expect(coordinate).toBeGreaterThanOrEqual(1);
        expect(coordinate).toBeLessThanOrEqual(27);
      }
      if (index % 100 === 0) shapes.add(path);
    }
    expect(shapes.size).toBe(4);
  });
  it("morphs continuously through a closed repeating cycle", () => {
    const coordinates = (phase) =>
      cursorPath(phase)
        .match(/-?\d+(?:\.\d+)?/g)
        .map(Number);
    expect(cursorPath(0)).toBe(cursorPath(4));
    const previous = coordinates(3.9999),
      next = coordinates(0);
    expect(Math.max(...next.map((value, index) => Math.abs(value - previous[index])))).toBeLessThan(
      0.05,
    );
    expect(cursorPath(0.5)).not.toBe(cursorPath(0));
  });
});
