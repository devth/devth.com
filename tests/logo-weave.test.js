import { describe, expect, it } from "vitest";
import { findStroke, inkField, wrapPlan } from "../src/logo-weave.js";
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
const layer = ({ start, end }) => (start[2] + end[2] < 0 ? "back" : "front");

describe("encounter-driven glyph wrapping", () => {
  it("uses actual ink distances, including transparent gaps, not glyph rectangles", () => {
    const field = stroke();
    expect(field(25, 20).distance).toBeGreaterThan(0);
    expect(field(35, 20).distance).toBeLessThan(0);
    expect(stroke(true)(35, 40).distance).toBeGreaterThan(0);
    expect(field(-1, 20)).toBeNull();
  });

  it("measures the stroke a tip is about to meet, and nothing else", () => {
    const met = findStroke([18, 20], 0, stroke());
    expect(met.center[0]).toBeGreaterThan(33);
    expect(met.center[0]).toBeLessThan(38);
    expect(met.halfWidth).toBeGreaterThan(4);
    expect(met.halfWidth).toBeLessThan(7);
    expect(met.normal[0]).toBeLessThan(-0.9);
    expect(findStroke([0, 20], 0, stroke())).toBeNull();
    expect(findStroke([18, 40], 0, stroke(true))).toBeNull();
    expect(findStroke([18, 20], Math.PI, stroke())).toBeNull();
    expect(findStroke([18, 20], 0, () => null)).toBeNull();
  });

  it("coils over and under the stroke and leaves on its far side", () => {
    const plan = wrapPlan([0, 0, 4], 0, { center: [30, 0], halfWidth: 6, normal: [-1, 0] }, 11);
    expect(plan.curves).toHaveLength(11);
    expect(plan.curves[0].start).toEqual([0, 0, 4]);
    const layers = plan.curves.slice(1).map(layer);
    expect(layers).toEqual([
      "front",
      "front",
      "back",
      "back",
      "front",
      "front",
      "back",
      "back",
      "front",
      "front",
    ]);
    // Front strands cross the stroke; rear ones are hidden behind it.
    const crossings = plan.curves
      .slice(1)
      .filter((curve) => Math.sign(curve.start[0] - 30) !== Math.sign(curve.end[0] - 30));
    expect(crossings.length).toBeGreaterThan(0);
    expect(plan.exit[0]).toBeGreaterThan(36);
    expect(plan.exit[2]).toBeCloseTo(0);
    for (const curve of plan.curves)
      for (const point of [curve.start, curve.control, curve.end])
        expect(point.every(Number.isFinite)).toBe(true);
    const rear = wrapPlan([0, 0, -4], 0, { center: [30, 0], halfWidth: 6, normal: [-1, 0] }, 11);
    expect(layer(rear.curves[1])).toBe("back");
    expect(
      wrapPlan([0, 0, 0], 0, { center: [30, 0], halfWidth: 6, normal: [-1, 0] }, 7).curves,
    ).toHaveLength(7);
    expect(
      wrapPlan([0, 0, 0], 0, { center: [30, 0], halfWidth: 6, normal: [-1, 0] }, 1),
    ).toBeNull();
  });

  it("gives every style room for a full over-under wrap without breaking its garden budget", () => {
    for (const { id } of studies) {
      const growth = createGrowth(id, 7, (point, angle, maximum) => {
        expect(maximum).toBeGreaterThanOrEqual(7);
        return wrapPlan(
          point,
          angle,
          { center: [point[0] + 20, point[1]], halfWidth: 6, normal: [-1, 0] },
          maximum,
        );
      });
      const frame = advance(growth, 8);
      expect(frame.contacts, id).toBeGreaterThan(0);
      expect(frame.segments, id).toBeLessThanOrEqual(680);
      expect(frame.tips, id).toBeLessThanOrEqual(24);
      expect(frame.front + frame.back + frame.accent, id).not.toMatch(/NaN|Infinity/);
    }
  });

  it("keeps the identical seed-specific growth when there is no encounter", () => {
    for (const { id } of studies) {
      const plain = advance(createGrowth(id, 7), 5);
      const untouched = advance(
        createGrowth(id, 7, () => null),
        5,
      );
      expect(untouched, id).toEqual(plain);
      expect(untouched.contacts).toBe(0);
    }
  });

  it("wraps the existing garden at contacts within budgets and read-only frames", () => {
    const field = stroke();
    let largest = 0;
    const growth = createGrowth("tendril", 7, (point, angle, maxCurves) => {
      largest = Math.max(largest, maxCurves);
      const met = findStroke([point[0] + 18, point[1] + 20], angle, field);
      return (
        met &&
        wrapPlan(
          point,
          angle,
          { ...met, center: [met.center[0] - 18, met.center[1] - 20] },
          maxCurves,
        )
      );
    });
    const frame = advance(growth, 5);
    expect(frame.contacts).toBeGreaterThan(0);
    expect(largest).toBe(11);
    expect(frame.segments).toBeLessThanOrEqual(680);
    expect(frame.tips).toBeLessThanOrEqual(24);
    expect(frame.back).not.toBe("");
    expect(frame.front + frame.back + frame.accent).not.toMatch(/NaN|Infinity/);
    expect(growth.frame()).toEqual(frame);
    growth.frame(0.4);
    expect(growth.frame()).toEqual(frame);
  });
});
