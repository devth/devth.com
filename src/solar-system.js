import * as THREE from "three";

export const lightYearsPerAU = 149597870700 / 9460730472580800;
export const orbitEpoch = Date.UTC(2000, 0, 1, 12);
export const millisecondsPerDay = 86400000;
export const orbitDaysPerSecond = 1;

// JPL J2000 elements: a, e, I, L, perihelion, node, longitude rate (deg/century).
// https://ssd.jpl.nasa.gov/planets/approx_pos.html — fixed elements, illustrative accelerated time.
const elements = [
  [
    "Mercury",
    0.38709927,
    0.20563593,
    7.00497902,
    252.2503235,
    77.45779628,
    48.33076593,
    149472.67411175,
    2439.7,
    "#b9b0a2",
  ],
  [
    "Venus",
    0.72333566,
    0.00677672,
    3.39467605,
    181.9790995,
    131.60246718,
    76.67984255,
    58517.81538729,
    6051.8,
    "#ead2a0",
  ],
  [
    "Earth",
    1.00000261,
    0.01671123,
    -0.00001531,
    100.46457166,
    102.93768193,
    0,
    35999.37244981,
    6371,
    "#679cda",
  ],
  [
    "Mars",
    1.52371034,
    0.0933941,
    1.84969142,
    -4.55343205,
    -23.94362959,
    49.55953891,
    19140.30268499,
    3389.5,
    "#d77b53",
  ],
  [
    "Jupiter",
    5.202887,
    0.04838624,
    1.30439695,
    34.39644051,
    14.72847983,
    100.47390909,
    3034.74612775,
    69911,
    "#d0ae8d",
  ],
  [
    "Saturn",
    9.53667594,
    0.05386179,
    2.48599187,
    49.95424423,
    92.59887831,
    113.66242448,
    1222.49362201,
    58232,
    "#d7c495",
  ],
  [
    "Uranus",
    19.18916464,
    0.04725744,
    0.77263783,
    313.23810451,
    170.9542763,
    74.01692503,
    428.48202785,
    25362,
    "#97d2d6",
  ],
  [
    "Neptune",
    30.06992276,
    0.00859048,
    1.77004347,
    -55.12002969,
    44.96476227,
    131.78422574,
    218.45945325,
    24622,
    "#547bd4",
  ],
];
export const planets = elements.map(
  ([name, a, e, inclination, longitude, perihelion, node, rate, radiusKm, color]) => ({
    name,
    a,
    e,
    inclination,
    longitude,
    perihelion,
    node,
    rate,
    radiusKm,
    color,
  }),
);

export function planetPosition(planet, days) {
  const rad = Math.PI / 180;
  const anomaly =
    ((planet.longitude + (planet.rate * days) / 36525 - planet.perihelion) % 360) * rad;
  let eccentric = anomaly;
  for (let i = 0; i < 6; i++)
    eccentric -=
      (eccentric - planet.e * Math.sin(eccentric) - anomaly) / (1 - planet.e * Math.cos(eccentric));
  const x = planet.a * (Math.cos(eccentric) - planet.e);
  const y = planet.a * Math.sqrt(1 - planet.e ** 2) * Math.sin(eccentric);
  const w = (planet.perihelion - planet.node) * rad,
    n = planet.node * rad,
    inclination = planet.inclination * rad;
  const cw = Math.cos(w),
    sw = Math.sin(w),
    cn = Math.cos(n),
    sn = Math.sin(n),
    ci = Math.cos(inclination),
    si = Math.sin(inclination);
  const ex = (cw * cn - sw * sn * ci) * x + (-sw * cn - cw * sn * ci) * y;
  const ey = (cw * sn + sw * cn * ci) * x + (-sw * sn + cw * cn * ci) * y;
  const ez = sw * si * x + cw * si * y;
  const obliquity = 23.43928 * rad;
  return [
    ex,
    Math.sin(obliquity) * ey + Math.cos(obliquity) * ez,
    -(Math.cos(obliquity) * ey - Math.sin(obliquity) * ez),
  ];
}

export function createSolarSystem(geometry, material) {
  const group = new THREE.Group();
  group.scale.setScalar(lightYearsPerAU);
  const sphere = geometry(new THREE.SphereGeometry(1, 24, 16));
  const sun = new THREE.Mesh(sphere, material(new THREE.MeshBasicMaterial({ color: "#ffdd91" })));
  group.add(
    sun,
    new THREE.AmbientLight("#d6e5ff", 1.2),
    new THREE.PointLight("#fff0d6", 2.5, 0, 0),
  );
  const bodies = [{ name: "Sun", mesh: sun, radiusKm: 695700, a: 0 }];
  for (const planet of planets) {
    const mesh = new THREE.Mesh(
      sphere,
      material(new THREE.MeshLambertMaterial({ color: planet.color })),
    );
    group.add(mesh);
    bodies.push({ ...planet, mesh });
    const points = Array.from(
      { length: 128 },
      (_, i) =>
        new THREE.Vector3(
          ...planetPosition(
            planet,
            (((i / 128) * 360 - planet.longitude + planet.perihelion) * 36525) / planet.rate,
          ),
        ),
    );
    group.add(
      new THREE.LineLoop(
        geometry(new THREE.BufferGeometry().setFromPoints(points)),
        material(
          new THREE.LineBasicMaterial({ color: "#73849b", transparent: true, opacity: 0.3 }),
        ),
      ),
    );
    if (planet.name === "Saturn") {
      const rings = new THREE.Mesh(
        geometry(new THREE.RingGeometry(1.4, 2.3, 48)),
        material(
          new THREE.MeshBasicMaterial({
            color: "#bdad8b",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65,
          }),
        ),
      );
      rings.rotation.x = Math.PI / 2 + 0.47;
      mesh.add(rings);
    }
  }
  const cameraAU = new THREE.Vector3();
  function update(days, camera, height) {
    cameraAU.copy(camera.position).divideScalar(lightYearsPerAU);
    for (const body of bodies) {
      if (body.a) body.mesh.position.fromArray(planetPosition(body, days));
      const pixelAU =
        (2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          cameraAU.distanceTo(body.mesh.position)) /
        height;
      const giant = body.radiusKm > 20000;
      const minPixels = body.a ? (giant ? 5 : 3) : 7;
      const maxAU = body.a ? (giant ? 0.2 : 0.06) : 0.15;
      const radius = Math.max(body.radiusKm / 149597870.7, Math.min(pixelAU * minPixels, maxAU));
      body.mesh.scale.setScalar(radius);
    }
    group.updateMatrixWorld(true);
  }
  return { group, bodies, update };
}
