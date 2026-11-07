import { it, expect } from "vitest";
import { Group, DoubleSide } from "three";
import { createDepthInk } from "../src/growth-depth.js";
import { studies, studyFrame } from "../src/hover-studies.js";

it("appends depth-tested ink without modifying earlier vertices, and unwinds by draw count", () => {
  const parent = new Group(),
    ink = createDepthInk(parent, "#222222", "#bb3322");
  const curve = (index) => ({
    start: [index, 0, -2],
    control: [index + 0.5, 1, 0],
    end: [index + 1, 0, 2],
    accent: false,
  });
  ink.root.scale.y = -1;
  ink.append([curve(0)]);
  const mesh = ink.root.children[0],
    prefix = mesh.geometry.attributes.instanceStart.data.array.slice(0, 48);
  expect(mesh.material.side).toBe(DoubleSide); // Screen-space ribbons must survive a mirrored native Y axis.
  ink.append(Array.from({ length: 500 }, (_, i) => curve(i + 1)));
  expect(mesh.geometry.attributes.instanceStart.data.array.slice(0, 48)).toEqual(prefix);
  expect(ink.root.children.length).toBeGreaterThan(1);
  const full = ink.root.children.reduce((sum, child) => sum + child.geometry.instanceCount, 0);
  ink.retention(0.5);
  expect(ink.root.children.reduce((sum, child) => sum + child.geometry.instanceCount, 0)).toBe(
    Math.floor(full / 2),
  );
  expect(mesh.geometry.attributes.instanceStart.data.array.slice(0, 48)).toEqual(prefix);
  ink.retention(1);
  expect(ink.root.children.reduce((sum, child) => sum + child.geometry.instanceCount, 0)).toBe(
    full,
  );
  ink.dispose();
  expect(parent.children).toHaveLength(0);
});

it("collects the actual fifteen native seed geometries without changing their SVG or growth extent", () => {
  for (const { id } of studies) {
    const curves = [],
      original = studyFrame(id, 2, 0.7);
    expect(studyFrame(id, 2, 0.7, (curve) => curves.push(curve))).toEqual(original);
    expect(curves.length).toBeGreaterThan(0);
    for (const curve of curves) {
      expect([curve.start, curve.control, curve.end].flat().every(Number.isFinite)).toBe(true);
      expect(
        Math.max(...[curve.start, curve.control, curve.end].map((point) => Math.hypot(...point))),
      ).toBeLessThan(100);
    }
  }
});
