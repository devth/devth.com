import { it, expect } from "vitest";
import { cursorPath } from "../src/cursor-geometry.js";

it("selects simple closed pointers with the same precise tip and bounded geometry", () => {
  const shapes = new Set();
  for (const random of [0, 0.4, 0.9]) {
    const path = cursorPath(() => random);
    shapes.add(path);
    expect(path.startsWith("M2 2")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/L/g).length).toBeLessThanOrEqual(3);
    const coordinates = path.match(/\d+/g).map(Number);
    expect(Math.max(...coordinates)).toBeLessThanOrEqual(24);
  }
  expect(shapes.size).toBe(3);
});
it("samples randomness only once when selecting a pointer", () => {
  let calls = 0;
  const path = cursorPath(() => {
    calls++;
    return 0.4;
  });
  expect(path).toBeTruthy();
  expect(calls).toBe(1);
});
