import { rotate } from "./graph-geometry.js";
import { organicCurves } from "./organic-growth.js";

export const studies = [
  {
    id: "sigil",
    name: "Original sigil",
    description: "Five nodes. Nine struts. A wandering tumble.",
  },
  {
    id: "double",
    name: "Double helix",
    description: "Paired strands, cross-rungs, slow axial rotation.",
  },
  { id: "triple", name: "Triple helix", description: "Three interlaced strands around one spine." },
  {
    id: "braid",
    name: "Woven braid",
    description: "A horizontal weave with a softer rolling motion.",
  },
  {
    id: "spring",
    name: "Elastic coil",
    description: "One continuous spring, gently stretching in depth.",
  },
  { id: "knot", name: "Torus knot", description: "A closed loop threaded through its own orbit." },
  { id: "orbit", name: "Gyroscope", description: "Three tilted rings with a shared center." },
  {
    id: "lattice",
    name: "Space frame",
    description: "A dense cubic truss, turning as one structure.",
  },
  {
    id: "geodesic",
    name: "Geodesic cage",
    description: "A subdivided shell with front-to-back depth.",
  },
  { id: "mycelium", name: "Mycelium", description: "Uneven runners split into a creeping fungal network." },
  { id: "bramble", name: "Bramble", description: "Crooked canes carry thorns, leaves, and small blossoms." },
  { id: "coral", name: "Coral", description: "An off-center fan of forked branches and rounded polyps." },
  { id: "tendril", name: "Tendril", description: "A curling vine sends out sparse shoots and asymmetric leaves." },
  { id: "spore", name: "Spore", description: "Unequal stalks open into clusters of spore-bearing lobes." },
  { id: "storm", name: "Storm", description: "Jagged leaders fracture into an irregular branching discharge." },
];

const tau = Math.PI * 2;
function helix(strands, turns, radius, length, rungs = true) {
  const vertices = [];
  const edges = [];
  const steps = 48;
  for (let strand = 0; strand < strands; strand++) {
    for (let step = 0; step <= steps; step++) {
      const angle = (step / steps) * turns * tau + (strand / strands) * tau;
      vertices.push([
        Math.cos(angle) * radius,
        (step / steps - 0.5) * length,
        Math.sin(angle) * radius,
      ]);
      if (step) edges.push([vertices.length - 2, vertices.length - 1]);
    }
  }
  if (rungs)
    for (let step = 0; step <= steps; step += 6) {
      for (let strand = 0; strand < strands - 1; strand++)
        edges.push([strand * (steps + 1) + step, (strand + 1) * (steps + 1) + step]);
    }
  return { vertices, edges };
}
function loop(points) {
  return points.map((_, index) => [index, (index + 1) % points.length]);
}
const sigil = {
  vertices: [
    [-20, -12, 0],
    [20, -12, 0],
    [0, 22, 0],
    [0, 0, 24],
    [0, 0, -24],
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 0],
    [3, 0],
    [3, 1],
    [3, 2],
    [4, 0],
    [4, 1],
    [4, 2],
  ],
};
const double = helix(2, 1.75, 23, 86);
const triple = helix(3, 1.4, 24, 84);
const braid = helix(3, 2.25, 14, 95);
braid.vertices = braid.vertices.map(([x, y, z]) => [y, x, z * 0.65]);
const knotPoints = Array.from({ length: 96 }, (_, index) => {
  const angle = (index / 96) * tau;
  return [
    (2 + Math.cos(3 * angle)) * Math.cos(2 * angle) * 13,
    (2 + Math.cos(3 * angle)) * Math.sin(2 * angle) * 13,
    Math.sin(3 * angle) * 18,
  ];
});
const knot = { vertices: knotPoints, edges: loop(knotPoints) };
const orbit = { vertices: [], edges: [] };
for (let ring = 0; ring < 3; ring++) {
  const start = orbit.vertices.length;
  for (let step = 0; step < 48; step++) {
    const angle = (step / 48) * tau;
    const point = rotate(
      { x: 40 * Math.cos(angle), y: 40 * Math.sin(angle), z: 0 },
      ring * 0.95,
      ring * 0.7,
    );
    orbit.vertices.push([point.x, point.y, point.z]);
    orbit.edges.push([start + step, start + ((step + 1) % 48)]);
  }
}
const lattice = { vertices: [], edges: [] };
for (let x = 0; x < 3; x++)
  for (let y = 0; y < 3; y++)
    for (let z = 0; z < 3; z++) {
      const index = lattice.vertices.length;
      lattice.vertices.push([(x - 1) * 24, (y - 1) * 24, (z - 1) * 24]);
      if (x) lattice.edges.push([index, index - 9]);
      if (y) lattice.edges.push([index, index - 3]);
      if (z) lattice.edges.push([index, index - 1]);
    }
function geodesic() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = [-1, 1].flatMap((a) =>
    [-1, 1].flatMap((b) => [
      [0, a, b * phi],
      [a, b * phi, 0],
      [a * phi, 0, b],
    ]),
  );
  const neighbors = (a, b) => Math.hypot(...vertices[a].map((v, i) => v - vertices[b][i])) < 2.01;
  const faces = [];
  for (let a = 0; a < 12; a++)
    for (let b = a + 1; b < 12; b++)
      for (let c = b + 1; c < 12; c++)
        if (neighbors(a, b) && neighbors(a, c) && neighbors(b, c)) faces.push([a, b, c]);
  const midpoints = new Map();
  const edges = new Map();
  function midpoint(a, b) {
    const key = [a, b].sort((x, y) => x - y).join(":");
    if (!midpoints.has(key)) {
      const index = vertices.length;
      vertices.push(vertices[a].map((v, i) => (v + vertices[b][i]) / 2));
      midpoints.set(key, index);
    }
    return midpoints.get(key);
  }
  for (const [a, b, c] of faces) {
    const ab = midpoint(a, b),
      bc = midpoint(b, c),
      ca = midpoint(c, a);
    for (const triangle of [
      [a, ab, ca],
      [b, bc, ab],
      [c, ca, bc],
      [ab, bc, ca],
    ])
      for (const edge of loop(triangle).map(([x, y]) => [triangle[x], triangle[y]]))
        edges.set([...edge].sort((x, y) => x - y).join(":"), edge);
  }
  return {
    vertices: vertices.map((point) => point.map((v) => (v * 40) / Math.hypot(...point))),
    edges: [...edges.values()],
  };
}
const geometries = { sigil, double, triple, braid, knot, orbit, lattice, geodesic: geodesic() };

const organicGeometries = Object.fromEntries(
  studies.slice(9).map(({ id }) => [id, organicCurves(id, 2)]),
);

function organicStudyFrame(curves, time) {
  const radius = Math.max(...curves.flatMap(({ start, control, end }) =>
    [start, control, end].map((point) => Math.hypot(...point)),
  ));
  const pitch = 0.35 + time * 0.19 + Math.sin(time * 0.37) * 0.2;
  const yaw = 0.55 + time * 0.38 + Math.sin(time * 0.53) * 0.17;
  const project = ([x, y, z]) => {
    const point = rotate({ x: x * 46 / radius, y: y * 46 / radius, z: z * 46 / radius }, pitch, yaw);
    const scale = 220 / (220 - point.z);
    return { x: point.x * scale, y: point.y * scale, z: point.z };
  };
  const coordinate = ({ x, y }) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const frame = { back: "", front: "", accent: "" };
  for (const curve of curves) {
    const start = project(curve.start);
    const control = project(curve.control);
    const end = project(curve.end);
    const layer = curve.accent ? "accent" : start.z + end.z < 0 ? "back" : "front";
    frame[layer] += `M${coordinate(start)}Q${coordinate(control)} ${coordinate(end)}`;
  }
  return frame;
}

export function studyFrame(id, time = 0) {
  if (organicGeometries[id]) return organicStudyFrame(organicGeometries[id], time);
  const source =
    id === "spring" ? helix(1, 4, 22, 78 + Math.sin(time * 1.2) * 14, false) : geometries[id];
  const radius = Math.max(...source.vertices.map((point) => Math.hypot(...point)));
  const pitch =
    id === "double" || id === "triple"
      ? 0.22 + Math.sin(time * 0.4) * 0.16
      : 0.35 + time * 0.19 + Math.sin(time * 0.37) * 0.2;
  const yaw = 0.55 + time * (id === "braid" ? 0.18 : 0.38) + Math.sin(time * 0.53) * 0.17;
  const points = source.vertices.map(([x, y, z], index) => {
    const drift = id === "sigil" ? Math.sin(time * 0.7 + index * 1.4) * 1.5 : 0;
    const point = rotate(
      { x: ((x + drift) * 46) / radius, y: (y * 46) / radius, z: (z * 46) / radius },
      pitch,
      yaw,
    );
    const scale = 220 / (220 - point.z);
    return { x: point.x * scale, y: point.y * scale, z: point.z };
  });
  const frame = { back: "", front: "", accent: "" };
  source.edges.forEach(([a, b], index) => {
    const key =
      index === Math.floor(source.edges.length * 0.55)
        ? "accent"
        : points[a].z + points[b].z < 0
          ? "back"
          : "front";
    frame[key] +=
      `M${points[a].x.toFixed(2)} ${points[a].y.toFixed(2)}L${points[b].x.toFixed(2)} ${points[b].y.toFixed(2)}`;
  });
  return frame;
}
