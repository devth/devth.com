export function rotate({ x, y, z }, pitch, yaw) {
  const horizontal = x * Math.cos(yaw) + z * Math.sin(yaw);
  const depth = z * Math.cos(yaw) - x * Math.sin(yaw);
  return {
    x: horizontal,
    y: y * Math.cos(pitch) - depth * Math.sin(pitch),
    z: depth * Math.cos(pitch) + y * Math.sin(pitch),
  };
}

export function project(point, pitch = 0, yaw = 0) {
  const rotated = rotate(point, pitch, yaw);
  const scale = 1800 / (1800 - rotated.z);
  return { x: 720 + rotated.x * scale, y: 500 + rotated.y * scale, scale };
}

function regular(vertices) {
  const pairs = vertices.flatMap((a, i) =>
    vertices.slice(i + 1).map((b, offset) => ({
      edge: [i, i + offset + 1],
      distance: Math.hypot(...a.map((value, axis) => value - b[axis])),
    })),
  );
  const shortest = Math.min(...pairs.map(({ distance }) => distance));
  return {
    vertices,
    edges: pairs.filter(({ distance }) => distance < shortest * 1.001).map(({ edge }) => edge),
  };
}
const signs = [-1, 1];
const phi = (1 + Math.sqrt(5)) / 2;
const icosahedron = regular(
  signs.flatMap((a) =>
    signs.flatMap((b) => [
      [0, a, b * phi],
      [a, b * phi, 0],
      [a * phi, 0, b],
    ]),
  ),
);
const dodecahedron = regular([
  ...signs.flatMap((a) => signs.flatMap((b) => signs.map((c) => [a, b, c]))),
  ...signs.flatMap((a) =>
    signs.flatMap((b) => [
      [0, a / phi, b * phi],
      [a / phi, b * phi, 0],
      [a * phi, 0, b / phi],
    ]),
  ),
]);
const cuboctahedron = regular(
  signs.flatMap((a) =>
    signs.flatMap((b) => [
      [0, a, b],
      [a, b, 0],
      [a, 0, b],
    ]),
  ),
);
const star = {
  vertices: [
    [6, 0, 0],
    [-6, 0, 0],
    [0, 6, 0],
    [0, -6, 0],
    [0, 0, 6],
    [0, 0, -6],
  ],
  edges: [],
};
for (let i = 0; i < 6; i++) {
  for (let j = i + 1; j < 6; j++)
    if (Math.floor(i / 2) !== Math.floor(j / 2)) star.edges.push([i, j]);
}
for (const x of signs)
  for (const y of signs)
    for (const z of signs) {
      const tip = star.vertices.push([x * 5.5, y * 5.5, z * 5.5]) - 1;
      star.edges.push([tip, x > 0 ? 0 : 1], [tip, y > 0 ? 2 : 3], [tip, z > 0 ? 4 : 5]);
    }
const geometries = [icosahedron, dodecahedron, cuboctahedron, star].map(({ vertices, edges }) => {
  const radius = Math.max(...vertices.map((vertex) => Math.hypot(...vertex)));
  return { vertices: vertices.map((vertex) => vertex.map((value) => (value * 8) / radius)), edges };
});
export const shapeCount = geometries.length;

export function glyphPath(pitch = 0, yaw = 0, shape = 0) {
  const geometry = geometries[shape];
  const points = geometry.vertices.map(([x, y, z]) =>
    rotate({ x, y, z }, pitch + 0.35 + shape * 0.17, yaw + 0.55 + shape * 0.31),
  );
  return geometry.edges
    .map(
      ([a, b]) =>
        "M" +
        points[a].x.toFixed(2) +
        " " +
        points[a].y.toFixed(2) +
        "L" +
        points[b].x.toFixed(2) +
        " " +
        points[b].y.toFixed(2),
    )
    .join("");
}
