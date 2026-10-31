import { rotate } from "./graph-geometry.js";

const tau = Math.PI * 2;
const mix = (a, b, t = 0.5) => a.map((value, axis) => value + (b[axis] - value) * t);
const move = (point, x, y, z = 0) => [point[0] + x, point[1] + y, point[2] + z];
const line = (start, end, accent = false) => ({ start, control: mix(start, end), end, accent });
const curve = (start, control, end, accent = false) => ({ start, control, end, accent });
const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));

function arc(points, accent = false) {
  const curves = [];
  for (let index = 0; index + 2 < points.length; index += 2) {
    const [start, middle, end] = points.slice(index, index + 3);
    curves.push(
      curve(
        start,
        middle.map((v, axis) => 2 * v - (start[axis] + end[axis]) / 2),
        end,
        accent,
      ),
    );
  }
  return curves;
}

const rhythms = {
  sigil: [0.55, 0.35, 520, 240],
  double: [0.75, 0.45, 240, 100],
  triple: [0.85, 0.45, 260, 110],
  braid: [0.95, 0.5, 260, 100],
  spring: [0.8, 0.5, 250, 100],
  knot: [0.75, 0.45, 380, 160],
  orbit: [0.8, 0.5, 430, 160],
  lattice: [0.55, 0.35, 560, 220],
  geodesic: [0.6, 0.4, 500, 220],
  mycelium: [0.18, 0.18, 190, 80],
  bramble: [0.35, 0.3, 220, 90],
  coral: [0.4, 0.3, 180, 70],
  tendril: [0.55, 0.4, 230, 90],
  spore: [0.4, 0.4, 190, 80],
  storm: [0.16, 0.14, 420, 200],
};

/** A bounded drawing unit in the source's own visual grammar. The scheduler
 * owns time, eviction and clipping; each tip retains only its current unit.
 */
export function createGrowthGrammar(id, random) {
  if (!rhythms[id]) throw new RangeError(`Unknown growth study: ${id}`);
  const [interval, jitter, speed, speedJitter] = rhythms[id];
  const orientation = (random() - 0.5) * 0.7;
  const pitch = 0.35 + random() * 0.3;
  const yaw = 0.4 + random() * 0.4;
  const axes = Array.from({ length: 3 }, (_, axis) => {
    const vector = [0, 0, 0];
    vector[axis] = 1;
    const p = rotate({ x: vector[0], y: vector[1], z: vector[2] }, pitch, yaw);
    return [
      p.x * Math.cos(orientation) - p.y * Math.sin(orientation),
      p.x * Math.sin(orientation) + p.y * Math.cos(orientation),
      p.z,
    ];
  });
  const sizes = axes.map(() => 18 + random() * 10);
  const place = (origin, coordinates) =>
    origin.map((v, axis) => v + coordinates.reduce((sum, n, i) => sum + n * axes[i][axis], 0));
  const local = (origin, heading, x, y, z = 0) =>
    move(
      origin,
      Math.cos(heading) * x - Math.sin(heading) * y + z * 0.3,
      Math.sin(heading) * x + Math.cos(heading) * y + z * 0.2,
      z,
    );

  function lattice(tip) {
    const counts = axes.map(() => 1 + Math.floor(random() * 2));
    const spans = sizes.map((size) => size * (0.8 + random() * 0.4));
    const signs = axes.map(([x, y]) =>
      Math.cos(tip.angle) * x + Math.sin(tip.angle) * y >= 0 ? 1 : -1,
    );
    const vertices = new Map();
    const curves = [];
    const key = (x, y, z) => `${x}:${y}:${z}`;
    for (let x = 0; x <= counts[0]; x++)
      for (let y = 0; y <= counts[1]; y++)
        for (let z = 0; z <= counts[2]; z++) {
          const indices = [x, y, z];
          const point = place(
            tip.point,
            indices.map((n, axis) => n * spans[axis] * signs[axis]),
          );
          vertices.set(key(x, y, z), point);
          for (let axis = 0; axis < 3; axis++) {
            if (!indices[axis]) continue;
            const previous = [...indices];
            previous[axis]--;
            curves.push(line(vertices.get(key(...previous)), point, random() < 0.06));
          }
        }
    return { curves, exit: vertices.get(key(...counts)) };
  }

  function sigil(tip) {
    const width = 23 + random() * 17;
    const height = 20 + random() * 16;
    const coordinates = [
      [0, 0, 0],
      [width, 0, 0],
      [width * (0.35 + random() * 0.3), height, 0],
      [width * 0.5, height * 0.35, 16 + random() * 16],
      [width * 0.5, height * 0.35, -16 - random() * 16],
    ];
    const points = coordinates.map(([x, y, z]) => local(tip.point, tip.angle, x, y, z));
    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],
      [0, 3],
      [1, 3],
      [2, 3],
      [0, 4],
      [1, 4],
      [2, 4],
    ];
    if (random() < 0.65) {
      points.push(
        local(
          tip.point,
          tip.angle,
          width * 1.15,
          height * (0.2 + random() * 0.7),
          4 + random() * 15,
        ),
      );
      edges.push([1, 5], [3, 5], [4, 5]);
    }
    return {
      curves: edges.map(([a, b], index) => line(points[a], points[b], index === 5)),
      exit: points.at(-1),
    };
  }

  function geodesic(tip) {
    const count = 5 + Math.floor(random() * 4);
    const radius = 18 + random() * 12;
    const points = [tip.point];
    for (let ring = 0; ring < 2; ring++)
      for (let node = 0; node < count; node++) {
        const phase = ((node + ring * 0.5 + (random() - 0.5) * 0.12) / count) * tau;
        const r = radius * (0.8 + random() * 0.25);
        points.push(
          local(
            tip.point,
            tip.angle,
            radius * (ring ? 1.35 : 0.65),
            Math.cos(phase) * r,
            Math.sin(phase) * r,
          ),
        );
      }
    const far = points.length;
    points.push(local(tip.point, tip.angle, radius * 2, 0));
    const edges = [];
    for (let node = 0; node < count; node++) edges.push([0, 1 + node]);
    for (let node = 0; node < count; node++) {
      const next = (node + 1) % count;
      edges.push([1 + node, 1 + next], [1 + node, 1 + count + node], [1 + next, 1 + count + node]);
    }
    for (let node = 0; node < count; node++)
      edges.push([1 + count + node, 1 + count + ((node + 1) % count)], [1 + count + node, far]);
    return {
      curves: edges.map(([a, b], index) => line(points[a], points[b], index % 13 === 0)),
      exit: points[far],
    };
  }

  function strands(tip) {
    const count = id === "spring" ? 1 : id === "double" ? 2 : 3;
    const radius = tip.radius ? tip.radius * 0.8 + (11 + random() * 10) * 0.2 : 11 + random() * 10;
    const phase = tip.phase ?? random() * tau;
    const span = id === "spring" ? 22 + random() * 12 : 48 + random() * 24;
    const turn = tau * (0.7 + random() * 0.6);
    const samples = 8;
    const origin = tip.point;
    const heading = tip.angle;
    const previous = tip.strands;
    const paths = Array.from({ length: count }, (_, strand) => {
      const offset = phase + (strand * tau) / count;
      const start = previous?.[strand] || origin;
      const point = (t) => {
        const angle = offset + turn * t;
        const swell = previous ? 1 : Math.min(1, t * 4);
        const side = (Math.cos(angle) * swell - (previous ? Math.cos(offset) : 0)) * radius;
        const depth = (Math.sin(angle) * swell - (previous ? Math.sin(offset) : 0)) * radius;
        return local(
          start,
          heading,
          span * t + depth * (id === "spring" ? 0.8 : 0.2),
          side,
          depth * (id === "braid" ? 0.45 : 1),
        );
      };
      const points = Array.from({ length: samples * 2 + 1 }, (_, index) =>
        point(index / (samples * 2)),
      );
      points[0] = start;
      return { points, curves: arc(points, strand === 1 && id === "triple") };
    });
    const curves = [];
    for (let step = 0; step < samples; step++) {
      for (const path of paths) curves.push(path.curves[step]);
      if (id !== "spring" && id !== "braid" && step % 3 === 2)
        for (let strand = 0; strand < count - 1; strand++)
          curves.push(
            line(paths[strand].points[(step + 1) * 2], paths[strand + 1].points[(step + 1) * 2]),
          );
    }
    tip.strands = paths.map((path) => path.points.at(-1));
    tip.phase = phase + turn;
    tip.radius = radius;
    return { curves, exit: tip.strands[0] };
  }

  function knot(tip) {
    const winding = random() < 0.7 ? 3 : 5;
    const radius = 16 + random() * 12;
    const tube = 0.25 + random() * 0.35;
    const phase = random() * tau;
    const samples = 32;
    const position = (t) => {
      const r = radius * (1 + tube * Math.cos(winding * t + phase));
      return [
        r * Math.cos(2 * t),
        r * Math.sin(2 * t),
        radius * tube * Math.sin(winding * t + phase),
      ];
    };
    const first = position(0);
    const points = Array.from({ length: samples * 2 + 1 }, (_, index) => {
      const p = position((index / (samples * 2)) * tau);
      return local(tip.point, tip.angle, ...p.map((v, axis) => v - first[axis]));
    });
    points[0] = tip.point;
    points[points.length - 1] = tip.point;
    return { curves: arc(points), exit: points[Math.floor(samples / 3) * 2] };
  }

  function orbit(tip) {
    const radius = 18 + random() * 13;
    const rings = 2 + Math.floor(random() * 3);
    const samples = 16;
    const curves = [];
    for (let ring = 0; ring < rings; ring++) {
      const tilt = (ring * Math.PI) / rings + random() * 0.3;
      const minor = radius * (0.65 + random() * 0.5);
      const points = Array.from({ length: samples * 2 + 1 }, (_, index) => {
        const phase = (index / (samples * 2)) * tau;
        return local(
          tip.point,
          tip.angle,
          radius * (1 - Math.cos(phase)),
          Math.sin(phase) * minor * Math.cos(tilt),
          Math.sin(phase) * minor * Math.sin(tilt),
        );
      });
      points[0] = tip.point;
      points[points.length - 1] = tip.point;
      curves.push(...arc(points, ring === 1 && random() < 0.2));
    }
    return { curves, exit: local(tip.point, tip.angle, radius * 2, 0) };
  }

  function runner(tip, neighbor) {
    const start = tip.point;
    const length = id === "coral" ? 16 + random() * 12 : 24 + random() * 18;
    const previous = tip.angle;
    const turn =
      id === "storm"
        ? (random() - 0.5) * 1.7
        : id === "tendril"
          ? 0.12 + random() * 0.25
          : id === "coral"
            ? (random() - 0.5) * 0.35
            : (random() - 0.5) * 0.55;
    tip.angle += turn;
    if (id === "coral")
      tip.angle =
        -Math.PI / 2 +
        Math.atan2(Math.sin(tip.angle + Math.PI / 2), Math.cos(tip.angle + Math.PI / 2)) * 0.65;
    let end = move(
      start,
      Math.cos(tip.angle) * length,
      Math.sin(tip.angle) * length * (id === "mycelium" ? 0.7 : 1),
      (random() - 0.5) * (id === "mycelium" ? 2 : 10),
    );
    if (id === "mycelium" && random() < 0.25) end = neighbor?.(start) || end;
    const control =
      id === "storm"
        ? mix(start, end)
        : move(
            start,
            Math.cos(previous) * length * 0.55,
            Math.sin(previous) * length * 0.55,
            (end[2] - start[2]) / 2,
          );
    const curves = [curve(start, control, end, id === "storm" && random() < 0.12)];
    if (id === "bramble") {
      const middle = mix(start, end, 0.35 + random() * 0.3);
      middle[0] += (random() - 0.5) * 9;
      middle[1] += (random() - 0.5) * 9;
      curves.splice(0, 1, line(start, middle), line(middle, end));
    }
    return { curves, exit: end };
  }

  function decorate(tip) {
    const point = tip.point;
    const heading = tip.angle;
    const curves = [];
    const at = (x, y, z = 0) => local(point, heading, x, y, z);
    if (id === "bramble") {
      if (random() < 0.65)
        curves.push(
          line(point, at(4 + random() * 9, (random() < 0.5 ? -1 : 1) * (8 + random() * 8)), true),
        );
      if (random() < 0.4) {
        const side = random() < 0.5 ? -1 : 1;
        const leaf = at(11 + random() * 9, side * (12 + random() * 9));
        curves.push(curve(point, at(4, side * 20), leaf), curve(leaf, at(15, side * 4), point));
      }
      if (random() < 0.045) curves.push(...ornamentCurves(point, heading, 30, random));
    }
    if (id === "coral") {
      for (const side of [-1, 1]) {
        const fork = at(10 + random() * 12, side * (6 + random() * 9));
        curves.push(curve(point, at(7, side * 2), fork));
      }
    }
    if (id === "coral" && random() < 0.2) {
      const buds = 2 + Math.floor(random() * 2);
      for (let bud = 0; bud < buds; bud++) {
        const side = (bud - 1) * 7;
        const end = at(10 + random() * 10, side);
        curves.push(
          curve(point, at(12, side - 5), end, true),
          curve(end, at(20, side + 6), point, true),
        );
      }
    }
    if (id === "tendril" && random() < 0.2) {
      const radius = 8 + random() * 12;
      const turns = tau * (0.8 + random() * 0.8);
      const points = Array.from({ length: 17 }, (_, index) => {
        const t = index / 16;
        const r = radius * (1 - t * 0.8);
        return at(radius - Math.cos(t * turns) * r, Math.sin(t * turns) * r);
      });
      points[0] = point;
      curves.push(...arc(points, true));
    }
    if (id === "tendril" && random() < 0.18) {
      const side = random() < 0.5 ? -1 : 1;
      const leaf = at(15 + random() * 11, side * (8 + random() * 10));
      curves.push(curve(point, at(8, side * 21), leaf), curve(leaf, at(21, side * 2), point));
    }
    if (id === "spore" && random() < 0.26) {
      const sacs = 1 + Math.floor(random() * 4);
      for (let sac = 0; sac < sacs; sac++) {
        const spread = (sac - (sacs - 1) / 2) * (6 + random() * 6);
        const neck = at(8 + random() * 13, spread);
        curves.push(curve(point, at(6, spread * 0.25), neck));
        const radius = 4 + random() * 7;
        const nodes = 3 + Math.floor(random() * 2);
        const tilt = heading + (random() - 0.5) * 0.8;
        const points = Array.from({ length: nodes * 2 + 1 }, (_, index) => {
          const angle = (index / (nodes * 2)) * tau;
          return local(
            neck,
            tilt,
            (1 - Math.cos(angle)) * radius,
            Math.sin(angle) * radius * (0.65 + random() * 0.6),
            Math.sin(angle) * radius * 0.15,
          );
        });
        points[0] = neck;
        points[points.length - 1] = neck;
        curves.push(...arc(points, true));
      }
    }
    if (id === "storm" && random() < 0.45) {
      const fork = at(12 + random() * 16, (random() < 0.5 ? -1 : 1) * (10 + random() * 14));
      curves.push(
        line(point, fork),
        line(fork, move(fork, 4 + random() * 10, (random() - 0.5) * 20), true),
      );
    }
    return curves;
  }
  const builders = {
    sigil,
    lattice,
    geodesic,
    double: strands,
    triple: strands,
    braid: strands,
    spring: strands,
    knot,
    orbit,
  };
  return {
    maxUnitCurves: {
      sigil: 12,
      lattice: 54,
      geodesic: 48,
      double: 18,
      triple: 28,
      braid: 24,
      spring: 8,
      knot: 32,
      orbit: 64,
      mycelium: 1,
      bramble: 29,
      coral: 11,
      tendril: 11,
      spore: 21,
      storm: 3,
    }[id],
    roots: builders[id]
      ? 1
      : { mycelium: 7, bramble: 2, coral: 3, tendril: 1, spore: 4, storm: 2 }[id],
    initialDelay: builders[id] ? 0.6 : 0,
    birthInterval: () => interval + random() * jitter,
    speed: () => speed + random() * speedJitter,
    initialAngle: (root, count) =>
      ["double", "triple", "spring", "coral", "bramble", "spore"].includes(id)
        ? -Math.PI / 2 + (random() - 0.5) * 0.65
        : id === "braid"
          ? (random() - 0.5) * 0.4
          : (root / count) * tau + random() * 0.5,
    unit: (tip, neighbor) => (builders[id] || runner)(tip, neighbor),
    decorate,
    length: ({ start, control, end }) =>
      Math.max(1, distance(start, control) + distance(control, end)),
  };
}

/** Unequal petals, forks and lobes, used only by flowering bramble canes. */
export function ornamentCurves(point, heading, length, random) {
  const curves = [];
  const add = (start, control, end) => {
    if (curves.length < 24) curves.push({ start, control, end, accent: true });
  };
  const arms = 2 + Math.floor(random() * 6);
  const gaps = Array.from({ length: arms }, () => 0.25 + random());
  const total = gaps.reduce((sum, gap) => sum + gap, 0);
  const radius = length * (0.2 + random() * 0.5);
  const stretch = 0.45 + random();
  const lobes = random();
  let direction = heading + random() * tau;
  const offset = (angle, distance) => [
    point[0] + Math.cos(angle) * distance,
    point[1] + Math.sin(angle) * distance * stretch,
    point[2] + (random() - 0.5) * radius * 0.3,
  ];
  for (const gap of gaps) {
    direction += (gap / total) * tau;
    const reach = radius * (0.4 + random() * 0.85);
    const steps = random() < 0.45 ? 2 : 1;
    let start = point;
    for (let step = 1; step <= steps; step++) {
      const turn = direction + (random() - 0.5) * 0.9;
      const end = offset(turn, (reach * step) / steps);
      const control = offset(turn + (random() - 0.5) * 1.6, (reach * (step - 0.4)) / steps);
      add(start, control, end);
      if (random() < 0.5) {
        const fork = [
          end[0] + Math.cos(turn + (random() < 0.5 ? -1 : 1)) * reach * (0.2 + random() * 0.5),
          end[1] + Math.sin(turn + (random() - 0.5) * 2) * reach * (0.2 + random() * 0.5),
          end[2] + (random() - 0.5) * radius * 0.3,
        ];
        add(end, random() < 0.5 ? end : control, fork);
      }
      if (step === steps && random() < lobes)
        add(end, offset(direction - 0.2 - random() * 0.9, reach * (0.4 + random() * 0.6)), point);
      start = end;
    }
  }
  return curves;
}
