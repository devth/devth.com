import { Quaternion, Vector3 } from "three";

export const flightSeconds = 2.4;
export const flightEase = (time) => {
  const t = Math.max(0, Math.min(1, time));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// Vary the approach within a ten-degree cone facing the catalog center.
export function inwardOffset(destination, center, radius, seed) {
  const outward = destination.clone().sub(center);
  if (outward.lengthSq() < 1e-20) outward.set(0, 0.8, 1);
  outward.normalize();
  const up = Math.abs(outward.y) > 0.95 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const side = new Vector3().crossVectors(outward, up).normalize();
  const lift = new Vector3().crossVectors(side, outward).normalize();
  const angle = ((seed >>> 0) / 4294967296) * Math.PI * 2;
  const cone = Math.PI / 18;
  return outward
    .multiplyScalar(Math.cos(cone))
    .addScaledVector(side, Math.sin(cone) * Math.cos(angle))
    .addScaledVector(lift, Math.sin(cone) * Math.sin(angle))
    .multiplyScalar(radius);
}

export function cameraFlight(position, target, destination, offset) {
  const start = position.clone().sub(target);
  const direction = start.clone().normalize();
  return {
    target: target.clone(),
    destination: destination.clone(),
    direction,
    turn: new Quaternion().setFromUnitVectors(direction, offset.clone().normalize()),
    startRadius: start.length(),
    endRadius: offset.length(),
    elapsed: 0,
  };
}

export function sampleFlight(flight, progress, position = new Vector3(), target = new Vector3()) {
  const t = flightEase(progress);
  target.lerpVectors(flight.target, flight.destination, t);
  const radius = Math.exp(Math.log(flight.startRadius) * (1 - t) + Math.log(flight.endRadius) * t);
  position
    .copy(flight.direction)
    .applyQuaternion(new Quaternion().slerp(flight.turn, t))
    .multiplyScalar(radius)
    .add(target);
  return { position, target };
}
