import { it, expect } from "vite-plus/test";
import { createGrowthGrammar } from "../src/growth-grammar.js";
import { studies } from "../src/hover-studies.js";

function randomSource(seed) {
  let state = seed;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const key = (point) => JSON.stringify(point.map((value) => Math.round(value * 1e6) / 1e6));
const straight = ({ start, control, end }) =>
  control.every((value, axis) => Math.abs(value - (start[axis] + end[axis]) / 2) < 1e-8);
function graph(curves) {
  const nodes = new Map();
  for (const { start, end } of curves) {
    const a = key(start),
      b = key(end);
    if (!nodes.has(a)) nodes.set(a, new Set());
    if (!nodes.has(b)) nodes.set(b, new Set());
    nodes.get(a).add(b);
    nodes.get(b).add(a);
  }
  return nodes;
}
function sample(id, seed = 123) {
  const grammar = createGrowthGrammar(id, randomSource(seed));
  const tip = { point: [0, 0, 0], angle: -0.8 };
  const unit = grammar.unit(tip);
  tip.point = unit.exit;
  return { grammar, tip, unit, decoration: grammar.decorate(tip) };
}

it("constructs connected bounded units whose exits are actual source-style nodes", () => {
  for (const { id } of studies)
    for (let seed = 0; seed < 128; seed++) {
      const { grammar, unit, decoration } = sample(id, seed);
      const connected = new Set([key([0, 0, 0])]);
      expect(unit.curves.length).toBeGreaterThan(0);
      expect(unit.curves.length + decoration.length, id).toBeLessThanOrEqual(grammar.maxUnitCurves);
      for (const { start, control, end } of [...unit.curves, ...decoration]) {
        expect(connected.has(key(start)), id).toBe(true);
        connected.add(key(end));
        for (const point of [start, control, end]) expect(point.every(Number.isFinite)).toBe(true);
      }
      expect(connected.has(key(unit.exit)), id).toBe(true);
    }
});

it("keeps cubic trusses bipartite and axis-aligned, and the two faceted families triangulated", () => {
  for (let seed = 0; seed < 64; seed++) {
    const lattice = sample("lattice", seed).unit.curves;
    expect(lattice.every(straight)).toBe(true);
    const nodes = graph(lattice),
      colors = new Map([[nodes.keys().next().value, 0]]);
    const queue = [...colors.keys()];
    for (let index = 0; index < queue.length; index++)
      for (const neighbor of nodes.get(queue[index])) {
        if (!colors.has(neighbor)) {
          colors.set(neighbor, 1 - colors.get(queue[index]));
          queue.push(neighbor);
        }
        expect(colors.get(neighbor)).not.toBe(colors.get(queue[index]));
      }
    expect(colors.size).toBe(nodes.size);
    const directions = [];
    for (const { start, end } of lattice) {
      const vector = end.map((v, axis) => v - start[axis]);
      const length = Math.hypot(...vector);
      const direction = vector.map((v) => v / length);
      if (
        !directions.some(
          (axis) => Math.abs(axis.reduce((sum, v, i) => sum + v * direction[i], 0)) > 1 - 1e-8,
        )
      )
        directions.push(direction);
    }
    expect(directions).toHaveLength(3);
    for (const id of ["sigil", "geodesic"]) {
      const curves = sample(id, seed).unit.curves,
        nodes = graph(curves);
      expect(curves.every(straight)).toBe(true);
      expect(curves.length).toBe(nodes.size * 3 - 6);
      let triangles = 0;
      for (const [a, neighbors] of nodes)
        for (const b of neighbors)
          for (const c of nodes.get(b)) if (nodes.get(a).has(c)) triangles++;
      expect(triangles / 6).toBeGreaterThanOrEqual(id === "sigil" ? 6 : 20);
      expect(nodes.size).toBeGreaterThanOrEqual(id === "sigil" ? 5 : 12);
    }
  }
});

it("preserves strand counts and cross-rungs, while a spring remains one continuous open coil", () => {
  for (const [id, strands, edges, cycles] of [
    ["double", 2, 18, 2],
    ["triple", 3, 28, 4],
    ["braid", 3, 24, 0],
    ["spring", 1, 8, 0],
  ]) {
    const { grammar, tip, unit, decoration } = sample(id);
    expect(tip.strands).toHaveLength(strands);
    expect(unit.curves).toHaveLength(edges);
    expect(decoration).toEqual([]);
    const nodes = graph(unit.curves);
    expect(edges - nodes.size + 1).toBe(cycles);
    const ends = new Set(tip.strands.map(key));
    const next = grammar.unit(tip);
    for (let strand = 0; strand < strands; strand++)
      expect(ends.has(key(next.curves[strand].start))).toBe(true);
    if (id === "spring")
      expect([...nodes.values()].every((neighbors) => neighbors.size <= 2)).toBe(true);
    expect(unit.curves.some((curve) => !straight(curve))).toBe(true);
  }
});

it("grows closed toroidal knots and joined tilted rings without botanical decorations", () => {
  for (let seed = 0; seed < 64; seed++)
    for (const id of ["knot", "orbit"]) {
      const { unit, decoration } = sample(id, seed),
        nodes = graph(unit.curves);
      expect(decoration).toEqual([]);
      if (id === "knot") {
        expect(unit.curves).toHaveLength(32);
        expect([...nodes.values()].every((neighbors) => neighbors.size === 2)).toBe(true);
      } else {
        const rings = unit.curves.length / 16;
        expect(rings).toBeGreaterThanOrEqual(2);
        expect(rings).toBeLessThanOrEqual(4);
        expect(
          [...nodes.values()].filter((neighbors) => neighbors.size === rings * 2),
        ).toHaveLength(2);
      }
    }
});

it("distinguishes fungal fusion, thorn canes, coral forks, coiled shoots, spore sacs and discharge", () => {
  let fused = 0,
    spores = 0,
    tendrils = 0,
    thorns = 0;
  for (let seed = 0; seed < 128; seed++) {
    const grammar = createGrowthGrammar("mycelium", randomSource(seed));
    const target = [35, -10, 0];
    if (grammar.unit({ point: [0, 0, 0], angle: 0 }, () => target).exit === target) fused++;
    expect(sample("mycelium", seed).decoration).toEqual([]);
    const bramble = sample("bramble", seed);
    expect(bramble.unit.curves).toHaveLength(2);
    expect(bramble.unit.curves.every(straight)).toBe(true);
    thorns += bramble.decoration.filter(straight).length;
    expect(sample("coral", seed).decoration.length).toBeGreaterThanOrEqual(2);
    const tendril = sample("tendril", seed);
    if (tendril.decoration.length >= 8) tendrils++;
    const spore = sample("spore", seed);
    if (spore.decoration.length) {
      const nodes = graph(spore.decoration);
      expect(spore.decoration.length - nodes.size + 1).toBeGreaterThanOrEqual(1);
      spores++;
    }
    const storm = sample("storm", seed);
    expect([...storm.unit.curves, ...storm.decoration].every(straight)).toBe(true);
  }
  for (const count of [fused, spores, tendrils, thorns]) expect(count).toBeGreaterThan(10);
});

it("varies complete generations beyond rotation, uniform scale and drawing order in every family", () => {
  for (const { id } of studies) {
    const signatures = new Set();
    for (let seed = 0; seed < 128; seed++) {
      const grammar = createGrowthGrammar(id, randomSource(seed)),
        tip = { point: [0, 0, 0], angle: 0 };
      const lengths = [];
      for (let step = 0; step < 5; step++) {
        const unit = grammar.unit(tip);
        tip.point = unit.exit;
        for (const { start, control, end } of [...unit.curves, ...grammar.decorate(tip)])
          for (const [a, b] of [
            [start, control],
            [control, end],
            [start, end],
          ])
            lengths.push(Math.hypot(...a.map((v, axis) => v - b[axis])));
      }
      const longest = Math.max(...lengths);
      signatures.add(
        lengths
          .map((length) => (length / longest).toFixed(5))
          .sort()
          .join(","),
      );
    }
    expect(signatures.size, id).toBe(128);
  }
});
