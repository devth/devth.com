import { findStroke } from "./logo-weave.js";

const cases = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [
    [3, 0],
    [1, 2],
  ],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[0, 2]],
  [
    [0, 1],
    [2, 3],
  ],
  [[1, 2]],
  [[3, 1]],
  [[0, 1]],
  [[3, 0]],
  [],
];

function simplify(points, tolerance = 0.25) {
  if (points.length < 5) return points;
  const keep = new Set([0, points.length - 1]),
    stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop(),
      a = points[first],
      b = points[last];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = dx * dx + dy * dy;
    let farthest = -1,
      distance = tolerance * tolerance;
    for (let i = first + 1; i < last; i++) {
      const p = points[i],
        t = length
          ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length))
          : 0;
      const d = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
      if (d > distance) {
        distance = d;
        farthest = i;
      }
    }
    if (farthest !== -1) {
      keep.add(farthest);
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}

/** Interpolated marching squares: the font's real holes remain open geometry. */
export function alphaContours(alpha, width, height) {
  const nodes = new Map();
  const node = (point) => {
    const key = point.map((v) => v.toFixed(5)).join(":");
    if (!nodes.has(key)) nodes.set(key, { point, neighbors: [] });
    return nodes.get(key);
  };
  for (let y = 0; y < height - 1; y++)
    for (let x = 0; x < width - 1; x++) {
      const values = [
        alpha[y * width + x],
        alpha[y * width + x + 1],
        alpha[(y + 1) * width + x + 1],
        alpha[(y + 1) * width + x],
      ];
      const mask = values.reduce((bits, value, i) => bits | (value >= 128 ? 1 << i : 0), 0);
      if (!cases[mask].length) continue;
      const between = (a, b) => (127.5 - values[a]) / (values[b] - values[a]);
      const edges = [
        () => [x + between(0, 1), y],
        () => [x + 1, y + between(1, 2)],
        () => [x + between(3, 2), y + 1],
        () => [x, y + between(0, 3)],
      ];
      for (const [a, b] of cases[mask]) {
        const first = node(edges[a]()),
          second = node(edges[b]());
        first.neighbors.push(second);
        second.neighbors.push(first);
      }
    }
  const visited = new Set(),
    loops = [];
  for (const first of nodes.values()) {
    if (visited.has(first)) continue;
    const points = [];
    let current = first,
      previous;
    while (current && !visited.has(current)) {
      visited.add(current);
      points.push(current.point);
      const next = current.neighbors.find((candidate) => candidate !== previous);
      previous = current;
      current = next;
    }
    if (current === first && points.length > 3) {
      points.push(points[0]);
      const loop = simplify(points);
      loop.pop();
      if (loop.length > 3) loops.push(loop);
    }
  }
  return loops;
}

/** Continuous centerline around an actually encountered shallow stroke. */
export function strokeTrace(point, angle, sample, depth, pitch) {
  const stroke = findStroke(point, angle, sample);
  if (!stroke) return [];
  const clearance = 2.5,
    radius = stroke.halfWidth + clearance;
  const normal = stroke.normal,
    tangent = [-normal[1], normal[0]];
  const at = (theta) => {
    const cosine = Math.cos(theta),
      sine = Math.sin(theta);
    const across = Math.sign(cosine) * Math.abs(cosine) ** 0.55 * radius;
    const along = (pitch * theta) / (Math.PI * 2);
    const p = [
      stroke.center[0] + normal[0] * across + tangent[0] * along,
      stroke.center[1] + normal[1] * across + tangent[1] * along,
      -depth / 2 + Math.sign(sine) * Math.abs(sine) ** 0.55 * (depth / 2 + clearance),
    ];
    if (p[2] > -depth - 0.7 && p[2] < 0.7)
      for (let attempt = 0; attempt < 5; attempt++) {
        const hit = sample(p[0], p[1]);
        if (!hit || hit.distance >= clearance) break;
        const length = Math.hypot(hit.nx, hit.ny);
        if (!length) break;
        p[0] += (hit.nx / length) * (clearance - hit.distance);
        p[1] += (hit.ny / length) * (clearance - hit.distance);
      }
    return p;
  };
  const start = [point[0], point[1], clearance],
    first = at(0);
  const points = Array.from({ length: 9 }, (_, i) =>
    start.map((v, axis) => v + ((first[axis] - v) * i) / 8),
  );
  for (let step = 1; step <= 384; step++) points.push(at((step / 384) * Math.PI * 3));
  return points;
}

/** Seven connected quadratic arcs, in the native grammar's coordinate system.
 * A complete wrap is admitted or rejected as a unit, never budget-truncated. */
export function strokePlan(point, angle, sample, depth, pitch, origin, unit, maxCurves) {
  if (maxCurves < 7 || point[2] * unit < -depth - 4 || point[2] * unit > 4) return null;
  const position = [origin[0] + point[0] * unit, origin[1] + point[1] * unit];
  const points = strokeTrace(position, angle, sample, depth, pitch);
  if (!points.length) return null;
  for (let i = 0; i <= 8; i++)
    points[i][2] = point[2] * unit + ((points[8][2] - point[2] * unit) * i) / 8;
  const local = (p) => [(p[0] - origin[0]) / unit, (p[1] - origin[1]) / unit, p[2] / unit];
  const stops = [0, 8, 72, 136, 200, 264, 328, 392];
  const curves = stops.slice(1).map((stop, index) => {
    const start = index ? local(points[stops[index]]) : point;
    const end = local(points[stop]),
      middle = local(points[(stops[index] + stop) / 2]);
    return {
      start,
      end,
      control: start.map((v, axis) => 2 * middle[axis] - (v + end[axis]) / 2),
      accent: false,
    };
  });
  const last = curves.at(-1);
  return {
    curves,
    exit: last.end,
    angle: Math.atan2(last.end[1] - last.control[1], last.end[0] - last.control[0]),
  };
}
