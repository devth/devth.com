import { it, expect } from "vite-plus/test";
import { studies } from "../src/hover-studies.js";
import { normalizePreferences, chooseStructure } from "../src/hover-preferences.js";
it("defaults to random structure with generation enabled and rejects malformed saved preferences", () => {
  for (const value of [null, undefined, [], "x", { structure: "missing", generation: "false" }]) {
    expect(normalizePreferences(value)).toEqual({ structure: "random", generation: true });
  }
  for (const { id } of studies)
    expect(normalizePreferences({ structure: id, generation: false })).toEqual({
      structure: id,
      generation: false,
    });
});
it("uses every fixed structure and chooses a new random type without immediate repeats", () => {
  for (const { id } of studies) expect(chooseStructure(id)).toBe(id);
  let last;
  for (let i = 0; i < 100; i++) {
    const id = chooseStructure("random");
    expect(studies.some((study) => study.id === id)).toBe(true);
    expect(id).not.toBe(last);
    last = id;
  }
});
