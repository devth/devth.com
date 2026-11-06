import { describe, expect, it } from "vitest";
import { weaveFrame } from "../src/logo-weave.js";

const glyph = {
  height: 120,
  points: Array.from({ length: 17 }, (_, i) => [40, 120 - i * 7.5, 12]),
};
const count = (drawing) => Object.values(drawing).join("").match(/Q/g)?.length ?? 0;

describe("wordmark trellis", () => {
  it("shares at most90 finite curves across the existing three depth channels", () => {
    const before = structuredClone(glyph);
    const drawing = weaveFrame(Array(5).fill(glyph));
    expect(Object.keys(drawing)).toEqual(["back", "front", "accent"]);
    expect(count(drawing)).toBe(90);
    for (const path of Object.values(drawing)) {
      expect(path).not.toMatch(/NaN|Infinity|undefined/);
      expect(path.length).toBeGreaterThan(100);
    }
    expect(glyph).toEqual(before);
  });
  it("reveals and retracts the same deterministic seed without retaining history", () => {
    expect(count(weaveFrame([glyph], 0))).toBe(0);
    expect(count(weaveFrame([glyph], 0.5))).toBe(9);
    expect(count(weaveFrame([glyph], 1))).toBe(18);
    expect(weaveFrame([glyph], 1, 3)).toEqual(weaveFrame([glyph], 1, 3));
    expect(weaveFrame([glyph], 1, 3)).not.toEqual(weaveFrame([glyph], 1, 4));
    expect(weaveFrame([])).toEqual({ back: "", front: "", accent: "" });
  });
  it("translates into the existing SVG coordinate space without changing glyphs", () => {
    const projected = weaveFrame([glyph], 1, 0, ([x, y]) => [x + 20, y - 10]);
    expect(count(projected)).toBe(18);
    expect(projected).not.toEqual(weaveFrame([glyph]));
  });
});
