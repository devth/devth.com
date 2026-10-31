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
  const phase = age / 6;
  const generation = Math.floor(phase);
  const progress = phase - generation;
  const blend = progress * progress * (3 - 2 * progress);
  const previous = randomSource(id, seed, generation);
  const next = randomSource(id, seed, generation + 1);
  // A rolling generation morphs continuously; no six-second topology jump.
  const random = () => {
    const value = previous();
    return value + (next() - value) * blend;
  };
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
      const side = random() * 2 - 1;
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
      frontier.push({
        point: end,
        angle: heading,
        length: length * (0.9 + random() * 0.15),
        depth: depth + 1,
      });
      if ((depth + cursor) % profile.fork === 0 && frontier.length < budget) {
        const side = Math.sin((random() - 0.57) * Math.PI);
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

/** Incremental, fixed-scale roots. Only a bounded visible garden is materialized:
 * old offscreen tips are replenished from existing branch nodes, not magnified.
 * Advance is capped for suspended frames; callers own pause/resume and rendering.
 */
export function createGrowth(id, seed = 0) {
  const profile = profiles[id];
  if (!profile) throw new RangeError(`Unknown growth study: ${id}`);
  const random = randomSource(id, seed, "live-roots");
  const maxTips = 24;
  const completeLimit = maxSegments - maxTips;
  const core = 96;
  const fixedStep = 1 / 60;
  const origin = [0, 0, 0];
  const segments = [];
  const tips = [];
  let cursor = core;
  let roots = 0;
  let commits = 0;
  let elapsed = 0;
  let remainder = 0;
  let birthClock = 0;
  const defaultBounds = { left: -1400, right: 1400, top: -1000, bottom: 1000 };
  const inside = (point, bounds, margin = 0) =>
    point[0] >= bounds.left - margin &&
    point[0] <= bounds.right + margin &&
    point[1] >= bounds.top - margin &&
    point[1] <= bounds.bottom + margin;
  const append = (start, control, end, accent = false) => {
    const segment = { start, control, end, accent };
    if (segments.length < completeLimit) segments.push(segment);
    else {
      segments[cursor] = segment;
      cursor = cursor + 1 === completeLimit ? core : cursor + 1;
    }
  };
  function nextCurve(tip) {
    const angle = tip.angle;
    const bend = profile.curl * 0.18 + (random() - 0.5) * (id === "storm" ? 1.6 : 0.7);
    tip.angle += bend;
    const length = 26 + random() * 18;
    const start = tip.point;
    const end = [
      start[0] + Math.cos(tip.angle) * length,
      start[1] + Math.sin(tip.angle) * length * (id === "mycelium" ? 0.65 : 1),
      start[2] + (random() - 0.5) * length * 0.3,
    ];
    const control =
      id === "storm"
        ? start
        : [
            start[0] + Math.cos(angle - bend * 0.3) * length * 0.6,
            start[1] + Math.sin(angle - bend * 0.3) * length * 0.6,
            (start[2] + end[2]) / 2,
          ];
    tip.curve = { start, control, end, accent: roots % 9 === 0 };
    tip.length = length;
    tip.progress = 0;
  }
  function spawn(point, angle) {
    roots++;
    const tip = { point, angle, speed: 280 + random() * 120 };
    nextCurve(tip);
    if (tips.length === maxTips) tips.shift();
    tips.push(tip);
  }
  for (let root = 0; root < profile.roots; root++) {
    const angle = ["coral", "bramble", "spore"].includes(id)
      ? -Math.PI / 2 + (random() - 0.5) * 1.7
      : (root / profile.roots) * tau + random() * 0.5;
    spawn(origin, angle);
  }
  function sprout(bounds) {
    let parent;
    // Re-seeding the core as well as growing from live wood keeps the interior
    // populated after older outer detail leaves the bounded rendering window.
    if (roots % 5 !== 0) {
      for (let attempt = 0; attempt < 12 && segments.length; attempt++) {
        const candidate = segments[Math.floor(random() * segments.length)];
        if (inside(candidate.end, bounds)) {
          parent = candidate;
          break;
        }
      }
    }
    const point = parent?.end || origin;
    let angle = parent
      ? Math.atan2(parent.end[1] - parent.control[1], parent.end[0] - parent.control[0])
      : random() * tau;
    if (elapsed > 2 && roots % 3 === 0) {
      angle = Math.atan2(
        bounds.top + random() * (bounds.bottom - bounds.top) - point[1],
        bounds.left + random() * (bounds.right - bounds.left) - point[0],
      );
    }
    spawn(point, angle + (random() - 0.5) * profile.spread * 1.8);
  }
  function decorate({ end }, angle, length) {
    if (profile.leaf && commits % profile.leaf === 0) {
      const side = random() < 0.5 ? -1 : 1;
      const tip = [
        end[0] + Math.cos(angle + side) * length * 0.85,
        end[1] + Math.sin(angle + side) * length * 0.85,
        end[2],
      ];
      append(end, [tip[0] - Math.sin(angle) * length * 0.3, tip[1], tip[2]], tip);
      append(tip, [end[0], end[1] + Math.cos(angle) * length * 0.25, end[2]], end);
    }
    if (id === "bramble" && commits % 3 === 0) {
      const thorn = [
        end[0] + Math.cos(angle + 0.9) * length * 0.5,
        end[1] + Math.sin(angle + 0.9) * length * 0.5,
        end[2],
      ];
      append(end, end, thorn, true);
    }
    if (profile.bloom && commits % profile.bloom === 0) {
      const petals = id === "spore" ? 3 : id === "coral" ? 2 : 5;
      const radius = length * (id === "spore" ? 0.7 : 0.35);
      for (let petal = 0; petal < petals; petal++) {
        const direction = (petal / petals) * tau + random() * 0.4;
        const tip = [
          end[0] + Math.cos(direction) * radius,
          end[1] + Math.sin(direction) * radius,
          end[2],
        ];
        append(end, [tip[0] - radius * 0.5, tip[1] - radius * 0.4, tip[2]], tip, true);
        append(tip, [tip[0] + radius * 0.5, tip[1] + radius * 0.3, tip[2]], end, true);
      }
    }
  }
  function advance(seconds, viewport = defaultBounds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const bounds =
      [viewport.left, viewport.right, viewport.top, viewport.bottom].every(Number.isFinite) &&
      viewport.right > viewport.left &&
      viewport.bottom > viewport.top
        ? viewport
        : defaultBounds;
    remainder += Math.min(0.1, seconds);
    while (remainder + 1e-9 >= fixedStep) {
      remainder = Math.max(0, remainder - fixedStep);
      elapsed += fixedStep;
      birthClock += fixedStep;
      const interval = 0.22 + profile.fork * 0.04;
      if (birthClock >= interval || !tips.length) {
        birthClock %= interval;
        sprout(bounds);
      }
      for (let index = tips.length - 1; index >= 0; index--) {
        const tip = tips[index];
        tip.progress += (tip.speed * fixedStep) / tip.length;
        if (tip.progress < 1) continue;
        const overflow = (tip.progress - 1) * tip.length;
        const curve = tip.curve;
        append(curve.start, curve.control, curve.end, curve.accent);
        commits++;
        decorate(curve, tip.angle, tip.length);
        if (!inside(curve.end, bounds, 160)) {
          tips.splice(index, 1);
          continue;
        }
        tip.point = curve.end;
        nextCurve(tip);
        tip.progress = overflow / tip.length;
      }
    }
  }
  function frame() {
    const drawing = {
      back: "",
      front: "",
      accent: "",
      extent: 0,
      segments: 0,
      roots,
      tips: tips.length,
    };
    const coordinate = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
    function draw({ start, control, end, accent }) {
      const layer = accent ? "accent" : start[2] + end[2] < 0 ? "back" : "front";
      drawing[layer] += `M${coordinate(start)}Q${coordinate(control)} ${coordinate(end)}`;
      drawing.extent = Math.max(
        drawing.extent,
        ...[start, control, end].map(([x, y]) => Math.hypot(x, y)),
      );
      drawing.segments++;
    }
    segments.forEach(draw);
    for (const { curve, progress } of tips) {
      if (!progress) continue;
      const p = Math.min(1, progress);
      const mix = (a, b) => a.map((value, axis) => value + (b[axis] - value) * p);
      const control = mix(curve.start, curve.control);
      draw({ ...curve, control, end: mix(control, mix(curve.control, curve.end)) });
    }
    return drawing;
  }
  return { advance, frame };
}
