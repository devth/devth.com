import { readFileSync } from "node:fs";
import { it, expect } from "vite-plus/test";
import { PerspectiveCamera, Vector3 } from "three";
import { createConstellations, constellationView } from "../src/constellations.js";
import { starPosition, starDistance } from "../src/star-catalog.js";
const data = JSON.parse(
  readFileSync(new URL("../public/data/constellations.json", import.meta.url)),
);
const nearby = JSON.parse(
  readFileSync(new URL("../public/data/nearby-stars.json", import.meta.url)),
);

it("adds seven sourced figures at real distances without replacing nearby stars", () => {
  expect(data.figures.map((f) => f.name)).toEqual([
    "Orion",
    "Big Dipper",
    "Cassiopeia",
    "Cygnus",
    "Leo",
    "Scorpius",
    "Southern Cross",
  ]);
  expect(data.stars).toHaveLength(79);
  expect(data.figures.reduce((sum, f) => sum + f.edges.length, 0)).toBe(80);
  expect(data.figures[1].kind).toBe("asterism");
  const ids = new Set(nearby.stars.map((s) => s[0]));
  expect(data.stars.filter((s) => !ids.has(s[0]))).toHaveLength(62);
  for (const star of data.stars) {
    const original = nearby.stars.find((s) => s[0] === star[0]);
    if (original) expect(star.slice(2)).toEqual(original.slice(2));
    expect(starDistance(star)).toBeGreaterThan(0);
    expect(starDistance(star)).toBeLessThan(3000);
  }
  expect(starDistance(data.stars.find((s) => s[1] === "Alnilam"))).toBeCloseTo(1976.706, 2);
});
it("connects physical catalog positions and fits each sky pattern from near the Sun", () => {
  const resources = new Set();
  const register = (value) => {
    resources.add(value);
    return value;
  };
  const before = JSON.stringify(data);
  const model = createConstellations(data, register, register);
  const positions = model.group.children[0].geometry.getAttribute("position");
  expect(positions.count).toBe(160);
  const firstStar = data.stars.find((s) => s[0] === data.figures[0].edges[0][0]);
  expect(
    new Vector3()
      .fromBufferAttribute(positions, 0)
      .distanceTo(new Vector3(...starPosition(firstStar))),
  ).toBeLessThan(0.0001);
  for (const figure of model.figures)
    for (const aspect of [1.44, 393 / 800]) {
      const view = constellationView(figure, aspect);
      const camera = new PerspectiveCamera(view.fov, aspect, 0.1, 10000);
      camera.position.copy(view.target).add(view.offset);
      expect(camera.position.length()).toBeCloseTo(0.00316250148, 9);
      camera.lookAt(view.target);
      camera.updateMatrixWorld();
      for (const point of figure.points) {
        const p = point.clone().project(camera);
        expect(Math.abs(p.x)).toBeLessThan(0.9);
        expect(Math.abs(p.y)).toBeLessThan(0.9);
        expect(p.z).toBeGreaterThan(-1);
        expect(p.z).toBeLessThan(1);
      }
    }
  expect(JSON.stringify(data)).toBe(before);
  resources.forEach((resource) => resource.dispose());
});
