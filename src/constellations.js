import * as THREE from "three";
import { starPosition } from "./star-catalog.js";
import { lightYearsPerAU } from "./solar-system.js";

export function createConstellations(data, geometry, material) {
  const byId = new Map(
    data.stars.map((star) => [star[0], new THREE.Vector3(...starPosition(star))]),
  );
  const group = new THREE.Group();
  const points = [];
  const figures = data.figures.map((figure) => {
    for (const edge of figure.edges) points.push(...edge.map((id) => byId.get(id)));
    const vertices = [...new Set(figure.edges.flat())].map((id) => byId.get(id));
    const position = new THREE.Vector3();
    for (const point of vertices) position.add(point);
    position.divideScalar(vertices.length);
    return { ...figure, points: vertices, position };
  });
  if (points.length)
    group.add(
      new THREE.LineSegments(
        geometry(new THREE.BufferGeometry().setFromPoints(points)),
        material(
          new THREE.LineBasicMaterial({
            color: "#91acc4",
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
          }),
        ),
      ),
    );
  return { group, figures };
}

// A viewing target is a camera aim, not a synthetic star or a flattened sky sphere.
export function constellationView(figure, aspect, seed = 123) {
  const direction = new THREE.Vector3();
  const rays = figure.points.map((point) => point.clone().normalize());
  for (const ray of rays) direction.add(ray);
  direction.normalize();
  const up = Math.abs(direction.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  direction.applyAxisAngle(up, (((seed >>> 0) / 4294967296 - 0.5) * Math.PI) / 24);
  const right = new THREE.Vector3().crossVectors(direction, up).normalize();
  const vertical = new THREE.Vector3().crossVectors(right, direction).normalize();
  let tangent = Math.tan(THREE.MathUtils.degToRad(55 / 2));
  for (const ray of rays) {
    const forward = ray.dot(direction);
    tangent = Math.max(
      tangent,
      (Math.abs(ray.dot(right) / forward) / aspect) * 1.3,
      Math.abs(ray.dot(vertical) / forward) * 1.3,
    );
  }
  // Stay outside the planetary orbits without hiding them from the unified scene.
  const observer = right.clone().multiplyScalar(200 * lightYearsPerAU);
  return {
    target: direction.clone().multiplyScalar(10).add(observer),
    offset: direction.clone().multiplyScalar(-10),
    fov: THREE.MathUtils.radToDeg(2 * Math.atan(tangent)),
  };
}
