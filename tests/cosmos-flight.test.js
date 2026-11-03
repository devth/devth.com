import { Vector3 } from "three";
import { it, expect } from "vite-plus/test";
import { cameraFlight, sampleFlight, flightEase, flightSeconds } from "../src/cosmos-flight.js";

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
