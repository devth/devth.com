import { describe, it, expect } from "vite-plus/test";
import { readFileSync } from "node:fs";
import {
  lightYearsPerParsec,
  starDistance,
  starPosition,
  references,
} from "../src/star-catalog.js";
const catalog = JSON.parse(
  readFileSync(new URL("../public/data/nearby-stars.json", import.meta.url)),
);

describe("real stellar neighborhood", () => {
  it("retains a finite, uniquely identified HYG sample within 100 light-years", () => {
    expect(catalog.license).toBe("CC BY-SA 4.0");
    expect(catalog.epoch).toBe("J2000.0");
    expect(catalog.stars).toHaveLength(4060);
    expect(new Set(catalog.stars.map((star) => star[0])).size).toBe(catalog.stars.length);
    for (const star of catalog.stars) {
      expect(starPosition(star).every(Number.isFinite)).toBe(true);
      expect(starDistance(star)).toBeLessThanOrEqual(100.001);
      expect(Math.hypot(...starPosition(star))).toBeCloseTo(starDistance(star), 6);
    }
  });
  it("keeps catalog distances and a solar-system origin rather than fictional star positions", () => {
    const named = references(catalog);
    expect(named.every(Boolean)).toBe(true);
    expect(starDistance(named.find((star) => star[1] === "Sol"))).toBe(0);
    expect(starDistance(named.find((star) => star[1] === "Proxima Centauri"))).toBeCloseTo(4.23, 2);
    expect(starDistance(named.find((star) => star[1] === "Sirius"))).toBeCloseTo(8.6, 2);
    expect(starDistance(named.find((star) => star[1] === "Vega"))).toBeCloseTo(25.04, 2);
    expect(starPosition([1, "", 1, 0, 0])).toEqual([lightYearsPerParsec, 0, -0]);
    expect(starPosition([1, "", 0, 1, 0])).toEqual([0, 0, -lightYearsPerParsec]);
  });
});
