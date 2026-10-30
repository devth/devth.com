// Each profile changes branching topology as well as the silhouette. Original studies
// keep their wire geometry; these profiles describe their organic hover growth only.
const profiles = {
  sigil: { roots: 5, fork: 3, spread: 1.1, curl: 0.3, leaf: 7, bloom: 13 },
  double: { roots: 2, fork: 4, spread: 0.8, curl: 0.55, leaf: 5, bloom: 0 },
  triple: { roots: 3, fork: 3, spread: 1.2, curl: -0.45, leaf: 6, bloom: 17 },
  braid: { roots: 3, fork: 4, spread: 0.7, curl: 0.8, leaf: 3, bloom: 0 },
  spring: { roots: 1, fork: 5, spread: 0.9, curl: 1.1, leaf: 4, bloom: 11 },
  knot: { roots: 2, fork: 3, spread: 1.4, curl: 0.9, leaf: 0, bloom: 9 },
  orbit: { roots: 4, fork: 4, spread: 1.6, curl: -0.6, leaf: 5, bloom: 0 },
  lattice: { roots: 4, fork: 2, spread: 1.3, curl: 0.15, leaf: 0, bloom: 13 },
  geodesic: { roots: 6, fork: 3, spread: 1.5, curl: -0.3, leaf: 7, bloom: 11 },
  mycelium: { roots: 7, fork: 2, spread: 1.4, curl: 0.2, leaf: 0, bloom: 0 },
  bramble: { roots: 2, fork: 3, spread: 1.2, curl: -0.2, leaf: 2, bloom: 17 },
  coral: { roots: 3, fork: 2, spread: 0.65, curl: 0.1, leaf: 0, bloom: 7 },
  tendril: { roots: 1, fork: 5, spread: 1.3, curl: 1.25, leaf: 3, bloom: 0 },
  spore: { roots: 4, fork: 4, spread: 0.85, curl: -0.2, leaf: 0, bloom: 3 },
  storm: { roots: 2, fork: 2, spread: 1.7, curl: 0, leaf: 0, bloom: 0 },
};

const maxSegments = 680;
const tau = Math.PI * 2;

function randomSource(id, seed, generation) {
  let state = 2166136261;
  for (const character of `${id}:${seed}:${generation}`)
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function safeAge(ageSeconds) {
  return Number.isFinite(ageSeconds) ? Math.max(0, ageSeconds) : 0;
}

/** Quadratic 3D segments shared with the rotating study renderer. No retained state.
 * Only the active generation is materialized, including its leaves and blossoms.
 */
export function organicCurves(id, ageSeconds, seed = 0) {
  const profile = profiles[id];
  if (!profile) throw new RangeError(`Unknown growth study: ${id}`);
  const age = safeAge(ageSeconds);
  const budget = Math.min(maxSegments, Math.floor(age * 76));
  if (!budget) return [];
  // Rolling generations replace old detail instead of retaining a growing tree.
  const random = randomSource(id, seed, Math.floor(age / 6));
  const curves = [];
  const frontier = [];
  const origin = [0, 0, 0];
  const add = (start, control, end, accent = false) => {
    if (curves.length < budget) curves.push({ start, control, end, accent });
  };
  for (let root = 0; root < profile.roots; root++) {
    const angle =
      id === "coral" || id === "bramble" || id === "spore"
        ? -Math.PI / 2 + (random() - 0.5) * 1.7
        : (root / profile.roots) * tau + random() * 1.1;
    frontier.push({ point: origin, angle, length: 8 + random() * 9, depth: 0 });
  }
  let cursor = 0;
  while (curves.length < budget && cursor < frontier.length) {
    const { point, angle, length, depth } = frontier[cursor++];
    const bend = profile.curl + (random() - 0.5) * (id === "storm" ? 2.1 : 0.9);
    const heading = angle + bend;
    const end = [
      point[0] + Math.cos(heading) * length,
      point[1] + Math.sin(heading) * length * (id === "mycelium" ? 0.65 : 1),
      point[2] + (random() - 0.45) * length * (id === "mycelium" ? 0.2 : 0.8),
    ];
    const control = [
      point[0] + Math.cos(angle - bend * 0.5) * length * 0.65,
      point[1] + Math.sin(angle - bend * 0.5) * length * 0.65,
      (point[2] + end[2]) / 2 + (random() - 0.5) * length * 0.3,
    ];
    add(point, id === "storm" ? point : control, end, cursor % 19 === 0);

    if (profile.leaf && cursor % profile.leaf === 0) {
      const side = random() < 0.5 ? -1 : 1;
      const tip = [
        end[0] + Math.cos(heading + side) * length * 0.85,
        end[1] + Math.sin(heading + side) * length * 0.85,
        end[2] + length * 0.1,
      ];
      // Two unequal curves form a leaf, attached at an actual branch node.
      add(end, [tip[0] - Math.sin(heading) * length * 0.3, tip[1], tip[2]], tip);
      add(tip, [end[0], end[1] + Math.cos(heading) * length * 0.25, end[2]], end);
    }
    if (id === "bramble" && cursor % 3 === 0) {
      const thorn = [end[0] + length * 0.5, end[1] - length * 0.2, end[2]];
      add(end, end, thorn, true);
    }
    if (profile.bloom && cursor % profile.bloom === 0) {
      const petals = id === "spore" ? 3 : id === "coral" ? 2 : 5;
      for (let petal = 0; petal < petals; petal++) {
        const angle = (petal / petals) * tau + random() * 0.4;
        const radius = length * (id === "spore" ? 0.7 : 0.35);
        const tip = [end[0] + Math.cos(angle) * radius, end[1] + Math.sin(angle) * radius, end[2]];
        add(end, [tip[0] - radius * 0.5, tip[1] - radius * 0.4, tip[2]], tip, true);
        add(tip, [tip[0] + radius * 0.5, tip[1] + radius * 0.3, tip[2]], end, true);
      }
    }

    // The queue and every decoration share the same fixed detail budget. No
    // recursive expansion or age-proportional history is allocated.
    if (frontier.length < budget) {
      frontier.push({ point: end, angle: heading, length: length * (0.9 + random() * 0.15), depth: depth + 1 });
      if ((depth + cursor) % profile.fork === 0 && frontier.length < budget) {
        const side = random() < 0.57 ? -1 : 1;
        frontier.push({
          point: end,
          angle: heading + side * profile.spread * (0.65 + random() * 0.7),
          length: length * (0.65 + random() * 0.35),
          depth: depth + 1,
        });
      }
    }
  }
  return curves;
}

/** Local SVG paths: the caller owns viewport translation and glyph scaling.
 * Extent encloses endpoints AND curve controls. Segment count includes decorations.
 */
export function growthFrame(id, ageSeconds, seed = 0) {
  const age = safeAge(ageSeconds);
  const curves = organicCurves(id, age, seed);
  const frame = { back: "", front: "", accent: "", extent: 0, segments: curves.length };
  if (!curves.length) return frame;
  // Reach has no terminal size. The sublinear power keeps this finite even at
  // Number.MAX_VALUE; the logarithmic factor accelerates the first few seconds.
  const extent = 80 * age ** 0.9 * (1 + Math.log1p(age) ** 2);
  const radius = Math.max(...curves.flatMap(({ start, control, end }) =>
    [start, control, end].map(([x, y]) => Math.hypot(x, y)),
  ));
  const scale = extent / radius;
  const coordinate = ([x, y]) => `${(x * scale).toFixed(2)} ${(y * scale).toFixed(2)}`;
  for (const { start, control, end, accent } of curves) {
    const layer = accent ? "accent" : start[2] + end[2] < 0 ? "back" : "front";
    frame[layer] += `M${coordinate(start)}Q${coordinate(control)} ${coordinate(end)}`;
  }
  frame.extent = extent;
  return frame;
}
