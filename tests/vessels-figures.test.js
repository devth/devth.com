import { it, expect } from "vite-plus/test";
import {
  defaults,
  renderers,
  readout,
  pointerValue,
  curveFacts,
  viscosityFacts,
  GUARD_LOOP,
  MOTION_START,
  MOTION_END,
} from "../src/vessels-figures.js";

const extremes = {
  circuit: [{ level: "aorta" }, { level: "cavae" }],
  radius: [{ radius: 0.5 }, { radius: 1.5 }],
  tube: [
    { rbc: 2.5, mcv: 60, mch: 20, settle: 0 },
    { rbc: 7, mcv: 120, mch: 40, settle: 1 },
  ],
  curve: [
    { po2: 0, shifted: true },
    { po2: 120, shifted: false },
  ],
  content: [{ hb: 5 }, { hb: 20 }],
  viscosity: [
    { hct: 0.1, diameter: 5 },
    { hct: 0.7, diameter: 1000 },
  ],
  capillary: [
    { oncotic: 10, arterial: 50 },
    { oncotic: 35, arterial: 25 },
  ],
  guards: [{ time: 0 }, { time: GUARD_LOOP }],
};

it("renders every figure at phone and desktop widths without invalid numbers", () => {
  for (const [kind, render] of Object.entries(renderers)) {
    for (const state of [defaults[kind], ...extremes[kind]]) {
      for (const width of [320, 390, 600, 740]) {
        for (const time of [0, 2.5, 13]) {
          const markup = render(state, width, time);
          expect(markup, `${kind} ${width}`).toMatch(/^<svg class="vx-svg" width="\d+"/);
          expect(markup, `${kind} ${width}`).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
      expect(readout(kind, state)).not.toMatch(/NaN|undefined|Infinity/);
    }
  }
});

it("keeps animated layers separable from static layers", () => {
  for (const kind of ["circuit", "radius", "viscosity", "capillary", "guards"]) {
    const markup = renderers[kind](defaults[kind], 740, 1);
    const start = markup.indexOf(MOTION_START);
    expect(start, kind).toBeGreaterThan(0);
    expect(markup.indexOf(MOTION_END, start), kind).toBeGreaterThan(start);
  }
});

it("maps pointer positions back to the values the charts draw", () => {
  for (const width of [390, 740]) {
    for (const po2 of [10, 40, 100]) {
      const markup = renderers.curve({ po2, shifted: false }, width);
      const handle = markup.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="6" class="vx-handle"/);
      expect(pointerValue("curve", width, Number(handle[1]), Number(handle[2]))).toEqual({ po2 });
    }
    const radius = renderers.radius({ radius: 1.2 }, width, 0);
    const [, x, y] = radius.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="5.5" class="vx-handle"/);
    expect(pointerValue("radius", width, Number(x), Number(y)).radius).toBeCloseTo(1.2, 2);
  }
});

it("reports saturation, release and the viscosity optimum the charts show", () => {
  const facts = curveFacts({ po2: 40, shifted: false });
  expect(Math.round(facts.here * 100)).toBe(75);
  expect(facts.sites).toBe(36);
  expect(readout("curve", { po2: 40, shifted: false })).toContain("released 23 percentage points");
  expect(readout("viscosity", defaults.viscosity)).toContain("peaks at a hematocrit of 39%");
  expect(viscosityFacts({ hct: 0.45, diameter: 7 }).atEdge).toBe(true);
  expect(readout("viscosity", { hct: 0.45, diameter: 7 })).toContain("keeps rising");
  expect(readout("tube", defaults.tube)).toContain("inside the MedlinePlus adult reference ranges");
  expect(readout("tube", { rbc: 5, mcv: 70, mch: 22 })).toContain("is below the");
  // RBC is checked too, and sex-specific ranges are not merged.
  const lowCount = readout("tube", { rbc: 4, mcv: 100, mch: 32 });
  expect(lowCount).not.toContain("Every value");
  expect(lowCount).toMatch(/RBC<\/span> is below both adult ranges/);
  expect(readout("tube", { rbc: 5.8, mcv: 90, mch: 30 })).toContain(
    "inside the male range but not the female one",
  );
  // Displayed MCHC arithmetic balances: hemoglobin ÷ hematocrit as a fraction.
  expect(readout("tube", defaults.tube)).toContain(
    '15.0 <span class="keep-case">g/dL</span> ÷ 0.450 = 33.3',
  );
  expect(readout("tube", { rbc: 5, mcv: 90, mch: 30.5 })).toContain("× 30.5 ");
  expect(readout("capillary", { oncotic: 15, arterial: 35 })).toContain("whole length");
  expect(readout("capillary", defaults.capillary)).toContain("In the classic model");
  expect(readout("capillary", defaults.capillary)).toContain("first 59%");
});
