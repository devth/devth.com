import { describe, expect, it } from "vitest";
import { inkField, steerInk } from "../src/logo-weave.js";
import { createGrowth } from "../src/organic-growth.js";
import { studies } from "../src/hover-studies.js";

const width = 80,
  height = 80;
function stroke(gap = false) {
  return inkField(
    Uint8Array.from({ length: width * height }, (_, i) => {
      const x = i % width,
        y = Math.floor(i / width);
      return x >= 30 && x <= 40 && y >= 10 && y <= 70 && !(gap && y >= 30 && y <= 50) ? 255 : 0;
    }),
    width,
    height,
  );
}
function advance(growth, seconds) {
  for (let i = 0; i < seconds * 60; i++) growth.advance(1 / 60);
  return growth.frame();
}

describe("encounter-driven glyph interaction", () => {
  it("uses actual ink distances, including transparent gaps, not glyph rectangles", () => {
    const field = stroke();
    expect(field(25, 20).distance).toBeGreaterThan(0);
    expect(field(35, 20).distance).toBeLessThan(0);
    expect(stroke(true)(35, 40).distance).toBeGreaterThan(0);
    expect(field(-1, 20)).toBeNull();
  });
  it("turns an approaching surface-level tip along the stroke without inventing geometry", () => {
    const heading = steerInk([18, 20, 0], 0, stroke());
    expect(Math.abs(heading)).toBeGreaterThan(0.5);
    expect(Math.abs(heading)).toBeLessThanOrEqual(1.2);
    expect(steerInk([18, 20, 0], Math.PI, stroke())).toBe(Math.PI);
  });
  it("leaves distant growth, holes, empty ink and front/back clearance unchanged", () => {
    expect(steerInk([3, 20, 0], 0, stroke())).toBe(0);
    expect(steerInk([18, 40, 0], 0, stroke(true))).toBe(0);
    const empty = inkField(new Uint8Array(width * height), width, height);
    expect(steerInk([18, 20, 0], 0, empty)).toBe(0);
    let queries = 0;
    for (const z of [-10, -1, 9, 100])
      expect(
        steerInk([18, 20, z], 0, () => {
          queries++;
          return { distance: -1, nx: -1, ny: 0 };
        }),
      ).toBe(0);
    expect(queries).toBe(0);
  });
  it("keeps the identical seed-specific growth when there is no encounter", () => {
    for (const { id } of studies) {
      const plain = advance(createGrowth(id, 7), 5);
      const untouched = advance(
        createGrowth(id, 7, (point, angle) => steerInk(point, angle, () => null)),
        5,
      );
      expect(untouched, id).toEqual(plain);
      expect(untouched.contacts).toBe(0);
    }
  });
  it("redirects the existing garden only at contacts and retains budgets and read-only frames", () => {
    const field = stroke();
    const growth = createGrowth("tendril", 7, (point, angle) =>
      steerInk([point[0] + 18, point[1] + 20, point[2]], angle, field),
    );
    const frame = advance(growth, 5);
    expect(frame.contacts).toBeGreaterThan(0);
    expect(frame.segments).toBeLessThanOrEqual(680);
    expect(frame.tips).toBeLessThanOrEqual(24);
    expect(frame.front + frame.back + frame.accent).not.toMatch(/NaN|Infinity/);
    expect(frame).not.toEqual(advance(createGrowth("tendril", 7), 5));
    expect(growth.frame()).toEqual(frame);
    growth.frame(0.4);
    expect(growth.frame()).toEqual(frame);
  });
});
