import { it, expect } from "vite-plus/test";
import { createDemolitionPhysics, pieceLimit } from "../src/demolition-physics.js";

function seeded(seed = 83) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const model = (left = 150, top = 20, width = 180, height = 48) => ({
  rect: { left, top, width, height },
});
const run = (world, seconds, dt = 1 / 60) => {
  for (let i = 0; i < Math.round(seconds / dt); i++) world.advance(dt);
};

it("integrates actual XYZ rigid bodies at fixed steps rather than CSS trajectories", () => {
  const first = createDemolitionPhysics([model()], 800, 600, seeded());
  const second = createDemolitionPhysics([model()], 800, 600, seeded());
  const original = [...first.pieces.values()][0];
  const position = original.body.position.clone();
  run(first, 1);
  run(second, 1, 1 / 30);
  const repeated = [...second.pieces.values()][0];
  expect(original.body.position.y).toBeLessThan(position.y);
  expect(Math.abs(original.body.position.z - position.z)).toBeGreaterThan(0.1);
  expect(
    Math.abs(original.body.quaternion.x) + Math.abs(original.body.quaternion.y),
  ).toBeGreaterThan(0.01);
  for (const axis of ["x", "y", "z"])
    expect(original.body.position[axis]).toBeCloseTo(repeated.body.position[axis], 7);
  expect(original.body.shapes[0].halfExtents.z).toBeGreaterThan(0);
  first.dispose();
  second.dispose();
});

it("fractures on a real floor impact before the age-based fallback", () => {
  const world = createDemolitionPhysics([model(180, 530, 180, 40)], 800, 600, seeded());
  const original = [...world.pieces.values()][0];
  while (world.elapsed < 1.7 && world.pieces.has(original.id)) world.advance(1 / 60);
  expect(world.pieces.has(original.id)).toBe(false);
  expect(world.elapsed - original.startAt).toBeLessThan(original.shatterAfter);
  expect([...world.pieces.values()].every((piece) => piece.depth === 1)).toBe(true);
  world.dispose();
});

it("rotates child offsets and preserves parent mass and centre of mass", () => {
  const world = createDemolitionPhysics([model()], 800, 600, seeded());
  const parent = [...world.pieces.values()][0];
  while (world.pieces.has(parent.id)) world.advance(1 / 60);
  const children = [...world.pieces.values()];
  expect(children).toHaveLength(4);
  const mass = children.reduce((total, child) => total + child.body.mass, 0);
  expect(mass).toBeCloseTo(parent.body.mass, 8);
  expect(
    children.reduce((sum, child) => sum + child.region.width * child.region.height, 0),
  ).toBeCloseTo(parent.region.width * parent.region.height, 6);
  for (const axis of ["x", "y", "z"]) {
    const centre =
      children.reduce((total, child) => total + child.body.position[axis] * child.body.mass, 0) /
      mass;
    expect(centre).toBeCloseTo(parent.body.position[axis], 7);
    for (const child of children)
      expect(child.body.quaternion[axis]).toBeCloseTo(parent.body.quaternion[axis], 7);
  }
  expect(new Set(children.map((child) => child.region.width.toFixed(3))).size).toBeGreaterThan(1);
  world.dispose();
});

it("bounds busy long-page simulations and releases every rigid body", () => {
  const models = Array.from({ length: 64 }, (_, i) =>
    model(100 + (i % 4) * 150, -i * 420, 120, 50),
  );
  const world = createDemolitionPhysics(models, 800, 600, seeded(121));
  let maximum = 0,
    fractured = false;
  for (let tick = 0; tick < 25 * 60; tick++) {
    world.advance(1 / 60);
    maximum = Math.max(maximum, world.pieces.size);
    for (const piece of world.pieces.values()) {
      fractured ||= piece.depth > 0;
      expect(piece.depth).toBeLessThanOrEqual(2);
      expect(
        [
          piece.body.position.x,
          piece.body.position.y,
          piece.body.position.z,
          piece.body.quaternion.w,
          piece.opacity,
          piece.scale,
        ].every(Number.isFinite),
      ).toBe(true);
    }
  }
  expect(fractured).toBe(true);
  expect(maximum).toBeLessThanOrEqual(pieceLimit);
  expect(world.done).toBe(true);
  expect(world.pieces.size).toBe(0);
  world.dispose();
  world.dispose();
  const elapsed = world.elapsed;
  world.advance(100);
  expect(world.elapsed).toBe(elapsed);
});

it("brings unseen content from below the document into the rain rather than starting inside the floor", () => {
  const world = createDemolitionPhysics([model(100, 2400, 220, 120)], 800, 600, seeded());
  const piece = [...world.pieces.values()][0];
  expect(piece.body.position.y - piece.region.height / 2).toBeGreaterThan(300);
  world.dispose();
});

it("keeps a visible bottom-crossing region in place and starts its unseen remainder above the viewport", () => {
  const world = createDemolitionPhysics([model(100, 550, 220, 160)], 800, 600, seeded());
  const pieces = [...world.pieces.values()];
  expect(pieces).toHaveLength(2);
  const visible = pieces.find((piece) => piece.region.y === 0);
  const unseen = pieces.find((piece) => piece.region.y > 0);
  expect(visible.region.height).toBe(50);
  expect(visible.body.position.y - visible.region.height / 2).toBe(-300);
  expect(unseen.body.position.y - unseen.region.height / 2).toBeGreaterThan(300);
  expect(pieces.reduce((mass, piece) => mass + piece.body.mass, 0)).toBeCloseTo(
    220 * 160 * 0.00008,
    7,
  );
  world.dispose();
});

it("caps catch-up, handles resizing and rejects malformed capture geometry", () => {
  const world = createDemolitionPhysics([model()], 800, 600, seeded());
  world.advance(Number.NaN);
  expect(world.elapsed).toBe(0);
  world.advance(100);
  expect(world.elapsed).toBeCloseTo(0.05, 7);
  world.resize(320, 480);
  run(world, 25);
  expect(world.done).toBe(true);
  world.dispose();
  expect(() => createDemolitionPhysics([model(0, 0, Number.NaN)], 800, 600)).toThrow(RangeError);
  expect(() =>
    createDemolitionPhysics(
      Array.from({ length: 65 }, () => model()),
      800,
      600,
    ),
  ).toThrow(RangeError);
});
