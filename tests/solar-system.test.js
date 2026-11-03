import { it, expect } from "vite-plus/test";
import { Vector3, PerspectiveCamera } from "three";
import {
  planets,
  planetPosition,
  lightYearsPerAU,
  orbitDaysPerSecond,
  createSolarSystem,
} from "../src/solar-system.js";

it("keeps all eight planetary orbits in proportional AU with bounded elliptic motion", () => {
  expect(planets.map((p) => p.name)).toEqual([
    "Mercury",
    "Venus",
    "Earth",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
  ]);
  expect(lightYearsPerAU * 63241.077).toBeCloseTo(1, 7);
  expect(orbitDaysPerSecond).toBe(1);
  for (const planet of planets) {
    for (const day of [0, 100, 9810, 100000]) {
      const position = planetPosition(planet, day);
      expect(position.every(Number.isFinite)).toBe(true);
      const radius = Math.hypot(...position);
      expect(radius).toBeGreaterThanOrEqual(planet.a * (1 - planet.e) - 1e-10);
      expect(radius).toBeLessThanOrEqual(planet.a * (1 + planet.e) + 1e-10);
    }
    const periodDays = (360 * 36525) / planet.rate;
    const start = new Vector3(...planetPosition(planet, 0));
    expect(new Vector3(...planetPosition(planet, periodDays)).distanceTo(start)).toBeLessThan(
      1e-10,
    );
    expect(new Vector3(...planetPosition(planet, 1)).distanceTo(start)).toBeGreaterThan(0);
  }
  expect((360 * 36525) / planets[2].rate / 60).toBeCloseTo(6.09, 1);
});
it("reveals the Sun and planets only near their real stellar origin, with registered disposable resources", () => {
  const resources = new Set();
  const register = (value) => {
    resources.add(value);
    return value;
  };
  const solar = createSolarSystem(register, register);
  const camera = new PerspectiveCamera(55);
  camera.position.set(0, 0, 1);
  solar.update(0, camera, 800);
  expect(solar.group.visible).toBe(false);
  camera.position.set(0, 0, 20 * lightYearsPerAU);
  solar.update(0, camera, 800);
  expect(solar.group.visible).toBe(true);
  expect(solar.bodies).toHaveLength(9);
  expect(solar.bodies[0].name).toBe("Sun");
  expect(solar.bodies[0].mesh.position.length()).toBe(0);
  const earth = solar.bodies.find((body) => body.name === "Earth");
  const first = earth.mesh.position.clone();
  solar.update(1, camera, 800);
  expect(earth.mesh.position.distanceTo(first)).toBeGreaterThan(0);
  for (const resource of resources) resource.dispose();
});
