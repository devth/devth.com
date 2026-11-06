import { Vector3 } from "three";
import { it, expect } from "vite-plus/test";
import {
  cameraFlight,
  sampleFlight,
  flightEase,
  flightSeconds,
  inwardOffset,
} from "../src/cosmos-flight.js";

it("finishes a smooth flight at the exact requested star and range", () => {
  const position = new Vector3(0, 0, 200),
    target = new Vector3();
  const destination = new Vector3(4, 2, -1),
    offset = new Vector3(0, 0, 0.0003);
  const flight = cameraFlight(position, target, destination, offset);
  const first = sampleFlight(flight, 0),
    last = sampleFlight(flight, 1);
  expect(first.position.distanceTo(position)).toBeLessThan(1e-12);
  expect(last.target.distanceTo(destination)).toBe(0);
  expect(last.position.distanceTo(destination.clone().add(offset))).toBeLessThan(1e-12);
  expect(position.toArray()).toEqual([0, 0, 200]);
  expect(flightSeconds).toBe(2.4);
});
it("arrives beyond the selected star looking inward, with deterministic seeded variation", () => {
  const center = new Vector3(1.7, 4.5, 0.15);
  for (const destination of [new Vector3(), new Vector3(8, -2, 4), new Vector3(1.7, 20, 0.15)]) {
    const towardCenter = center.clone().sub(destination).normalize();
    for (const seed of [0, 123, 1450000000, 3000000000, 4294967295]) {
      const offset = inwardOffset(destination, center, 0.8, seed);
      expect(offset.length()).toBeCloseTo(0.8, 12);
      expect(offset.clone().negate().normalize().dot(towardCenter)).toBeGreaterThan(0.98);
      expect(destination.clone().add(offset).distanceTo(center)).toBeGreaterThan(
        destination.distanceTo(center),
      );
      expect(offset.toArray()).toEqual(inwardOffset(destination, center, 0.8, seed).toArray());
    }
  }
  expect(
    inwardOffset(new Vector3(), center, 0.8, 0).distanceTo(
      inwardOffset(new Vector3(), center, 0.8, 1450000000),
    ),
  ).toBeGreaterThan(0.1);
  expect(inwardOffset(center, center, 0.8, 123).toArray().every(Number.isFinite)).toBe(true);
});

it("accelerates and decelerates with zero endpoint velocity and logarithmic zoom", () => {
  const step = 0.001;
  expect(flightEase(step) / step).toBeLessThan(0.00002);
  expect((1 - flightEase(1 - step)) / step).toBeLessThan(0.00002);
  expect(flightEase(0.5)).toBe(0.5);
  const flight = cameraFlight(
    new Vector3(0, 0, 200),
    new Vector3(),
    new Vector3(),
    new Vector3(0, 0, 0.0002),
  );
  expect(sampleFlight(flight, 0.5).position.length()).toBeCloseTo(Math.sqrt(200 * 0.0002), 10);
  expect(sampleFlight(flight, 2).position.length()).toBeCloseTo(0.0002, 10);
});
