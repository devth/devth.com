import { it, expect } from "vite-plus/test";
import { studies, studyFrame } from "../src/hover-studies.js";
import { organicCurves } from "../src/organic-growth.js";

const originalIds = [
  "sigil",
  "double",
  "triple",
  "braid",
  "spring",
  "knot",
  "orbit",
  "lattice",
  "geodesic",
];
const organicIds = ["mycelium", "bramble", "coral", "tendril", "spore", "storm"];

it("preserves the original nine studies and appends six organic studies in order", () => {
  expect(studies.map(({ id }) => id)).toEqual([...originalIds, ...organicIds]);
});

it("renders fifteen distinct deterministic finite studies that evolve within their shared frame", () => {
  expect(studies).toHaveLength(15);
  const starts = studies.map((study) => JSON.stringify(studyFrame(study.id)));
  expect(new Set(starts).size).toBe(15);
  for (const study of studies) {
    for (const time of [0, 1, 20, 10000]) {
      const paths = studyFrame(study.id, time);
      expect(paths).toEqual(studyFrame(study.id, time));
      expect(Object.keys(paths)).toEqual(["back", "front", "accent"]);
      const ink = Object.values(paths).join("");
      expect(ink).not.toMatch(/NaN|Infinity|undefined/);
      expect(ink.length).toBeGreaterThan(30);
      const coordinates = [...ink.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
        Math.abs(Number(match[0])),
      );
      expect(coordinates.length).toBeGreaterThan(10);
      expect(Math.max(...coordinates)).toBeLessThan(64);
      expect(paths.accent.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(studyFrame(study.id, 1))).not.toBe(
      JSON.stringify(studyFrame(study.id, 0)),
    );
  }
});

it("uses asymmetric branching and distinct leaf/blossom topology, not renamed helices", () => {
  const signatures = [];
  for (const id of organicIds) {
    const curves = organicCurves(id, 2);
    const starts = new Map();
    const ends = new Set(curves.map(({ end }) => end.join(":")));
    for (const { start } of curves) {
      const key = start.join(":");
      starts.set(key, (starts.get(key) || 0) + 1);
    }
    const forks = [...starts].filter(([point, degree]) => ends.has(point) && degree > 1);
    expect(forks.length).toBeGreaterThan(5);
    const leafSides = curves.filter((a) =>
      curves.some((b) => a.start === b.end && a.end === b.start),
    );
    const straight = curves.filter(({ start, control }) => start === control).length;
    signatures.push([starts.get("0:0:0"), forks.length, leafSides.length, straight].join(":"));
    if (id === "mycelium" || id === "storm") expect(leafSides).toHaveLength(0);
    else expect(leafSides.length).toBeGreaterThan(10);

    const points = curves.flatMap(({ end }) => [end]);
    const radius = Math.max(...points.map((point) => Math.hypot(...point)));
    const unmatched = points.filter(
      ([x, y, z]) =>
        !points.some(
          (point) => Math.hypot(point[0] + x, point[1] + y, point[2] + z) < radius * 0.01,
        ),
    );
    expect(unmatched.length).toBeGreaterThan(points.length * 0.8);
    expect(Object.values(studyFrame(id)).join("")).toContain("Q");
  }
  expect(new Set(signatures).size).toBe(6);
});
