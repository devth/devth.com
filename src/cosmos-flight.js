import { Quaternion, Vector3 } from "three";

export const flightSeconds = 0.72;
export const flightEase = (time) => {
  const t = Math.max(0, Math.min(1, time));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

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
