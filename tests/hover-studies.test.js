import { it, expect } from "vitest";
import { studies, studyFrame } from "../src/hover-studies.js";

it("renders nine distinct finite wire studies that evolve within their shared frame", () => {
  expect(studies).toHaveLength(9);
  const starts = studies.map((study) => JSON.stringify(studyFrame(study.id)));
  expect(new Set(starts).size).toBe(9);
  for (const study of studies) {
    for (const time of [0, 1, 20]) {
      const paths = studyFrame(study.id, time);
      const ink = Object.values(paths).join("");
      expect(ink).not.toMatch(/NaN|Infinity|undefined/);
      expect(ink.length).toBeGreaterThan(30);
      const coordinates = [...ink.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
        Math.abs(Number(match[0])),
      );
      expect(coordinates.length).toBeGreaterThan(10);
      expect(Math.max(...coordinates)).toBeLessThan(64);
    }
    expect(JSON.stringify(studyFrame(study.id, 1))).not.toBe(
      JSON.stringify(studyFrame(study.id, 0)),
    );
  }
});
