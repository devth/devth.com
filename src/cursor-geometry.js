const solids = [
  {
    vertices: [
      [-1, 0, -0.58],
      [1, 0, -0.58],
      [0, 0, 1.15],
      [0, -1.25, 0],
      [0, 1.25, 0],
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
  },
  {
    vertices: [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ],
  },
  {
    vertices: [
      [1.3, 0, 0],
      [-1.3, 0, 0],
      [0, 1.3, 0],
      [0, -1.3, 0],
      [0, 0, 1.3],
      [0, 0, -1.3],
    ],
    edges: [
      [0, 2],
      [2, 1],
      [1, 3],
      [3, 0],
      [0, 4],
      [2, 4],
      [1, 4],
      [3, 4],
      [0, 5],
      [2, 5],
      [1, 5],
      [3, 5],
    ],
  },
  {
    vertices: [
      [1, 1, 1],
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ],
  },
].map(({ vertices, edges }) =>
  Array.from({ length: 12 }, (_, index) =>
    edges[index % edges.length].flatMap((vertex) => vertices[vertex]),
  ).flat(),
);

export function cursorPath(progress) {
  const phase = ((progress % solids.length) + solids.length) % solids.length;
  const index = Math.floor(phase);
  const from = solids[index],
    to = solids[(index + 1) % solids.length];
  const amount = phase - index;
  const mix = amount * amount * (3 - 2 * amount);
  const angle = (phase * Math.PI) / 2;
  const cosine = Math.cos(angle),
    sine = Math.sin(angle);
  const pitch = 0.42,
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  let path = "";
  for (let index = 0; index < from.length; index += 3) {
    const x = from[index] + (to[index] - from[index]) * mix;
    const y = from[index + 1] + (to[index + 1] - from[index + 1]) * mix;
    const z = from[index + 2] + (to[index + 2] - from[index + 2]) * mix;
    const depth = z * cosine - x * sine;
    const rotatedY = y * cp - depth * sp;
    const scale = 7 / (1 + (y * sp + depth * cp) * 0.09);
    path +=
      (index % 6 === 0 ? "M" : "L") +
      (14 + (x * cosine + z * sine) * scale).toFixed(2) +
      " " +
      (14 + rotatedY * scale).toFixed(2);
  }
  return path;
}
