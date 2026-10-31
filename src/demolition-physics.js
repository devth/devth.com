import { World, Body, Box, Plane, Vec3, SAPBroadphase } from "cannon-es";

export const pieceLimit = 160;
const step = 1 / 60;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Pixel-sized rigid bodies shared by the DOM renderer and headless checks.
 * Originals never enter the world: fragments reference immutable capture regions.
 */
export function createDemolitionPhysics(models, width, height, random = Math.random) {
  if (
    models.length > 64 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    models.some(
      ({ rect }) =>
        !rect ||
        ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) ||
        rect.width <= 0 ||
        rect.height <= 0,
    )
  )
    throw new RangeError("Invalid demolition capture");
  const world = new World({ gravity: new Vec3(0, -110, 0), allowSleep: true });
  world.broadphase = new SAPBroadphase(world);
  world.solver.iterations = 8;
  world.defaultContactMaterial.friction = 0.45;
  world.defaultContactMaterial.restitution = 0.13;
  const pieces = new Map();
  const impacts = new Set();
  let elapsed = 0;
  let remainder = 0;
  let nextId = 0;
  let disposed = false;
  let depthLimit = 160;
  const floor = new Body({ mass: 0, shape: new Plane(), collisionFilterGroup: 2 });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  const back = new Body({ mass: 0, shape: new Plane(), collisionFilterGroup: 2 });
  const front = new Body({ mass: 0, shape: new Plane(), collisionFilterGroup: 2 });
  front.quaternion.setFromEuler(0, Math.PI, 0);
  world.addBody(floor);
  world.addBody(back);
  world.addBody(front);
  function resize(w, h) {
    if (disposed || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    width = w;
    height = h;
    depthLimit = Math.min(160, (height / (2 * Math.tan(Math.PI / 7))) * 0.25);
    floor.position.set(0, -height / 2 - 16, 0);
    back.position.set(0, 0, -depthLimit);
    front.position.set(0, 0, depthLimit);
    for (const wall of [floor, back, front]) wall.aabbNeedsUpdate = true;
    for (const { body } of pieces.values())
      body.position.z = clamp(body.position.z, -depthLimit * 0.8, depthLimit * 0.8);
    world.broadphase.dirty = true;
  }
  resize(width, height);

  function add(model, region, depth, startAt, parent) {
    const body = new Body({
      mass: parent
        ? (parent.body.mass * region.width * region.height) /
          (parent.region.width * parent.region.height)
        : (clamp(models[model].rect.width * models[model].rect.height * 0.00008, 0.08, 5) *
            region.width *
            region.height) /
          (models[model].rect.width * models[model].rect.height),
      shape: new Box(new Vec3(Math.max(1, region.width / 2), Math.max(1, region.height / 2), 1.2)),
      linearDamping: 0.12,
      angularDamping: 0.16,
      allowSleep: true,
      collisionFilterGroup: models[model].decorative ? 4 : 1,
      collisionFilterMask: models[model].decorative ? 2 : 3,
    });
    const piece = {
      id: ++nextId,
      model,
      region,
      depth,
      body,
      startAt,
      active: false,
      seenAt: null,
      opacity: 1,
      scale: 1,
      shatterAfter: depth ? 0.9 + random() * 0.9 : 1.8 + random() * 1.2,
      fadeAfter: 1.5 + random() * 1.1,
    };
    if (parent) {
      const offset = new Vec3(
        region.x + region.width / 2 - parent.region.x - parent.region.width / 2,
        -(region.y + region.height / 2 - parent.region.y - parent.region.height / 2),
        0,
      );
      parent.body.quaternion.vmult(offset, offset);
      parent.body.position.vadd(offset, body.position);
      body.quaternion.copy(parent.body.quaternion);
      const tangent = parent.body.angularVelocity.cross(offset);
      parent.body.velocity.vadd(tangent, body.velocity);
      body.velocity.x += (random() - 0.5) * 30;
      body.velocity.y += random() * 18;
      body.velocity.z += (random() - 0.5) * 50;
      body.angularVelocity.set(
        parent.body.angularVelocity.x + (random() - 0.5) * 2.5,
        parent.body.angularVelocity.y + (random() - 0.5) * 2.5,
        parent.body.angularVelocity.z + (random() - 0.5) * 2,
      );
    } else {
      const rect = models[model].rect;
      let y = rect.top + region.y;
      const unseen = y + region.height <= 2 || y >= height - 2;
      if (unseen) y = -region.height - height * (0.1 + random() * 0.9);
      body.position.set(
        rect.left + region.x + region.width / 2 - width / 2,
        height / 2 - y - region.height / 2,
        models[model].front ? 4 : unseen ? (random() - 0.5) * depthLimit : 0,
      );
      body.velocity.set((random() - 0.5) * 16, 0, (random() - 0.5) * 14);
      body.angularVelocity.set(
        (random() - 0.5) * 0.55,
        (random() - 0.5) * 0.7,
        (random() - 0.5) * 0.45,
      );
    }
    body.addEventListener("collide", (event) => {
      if (
        elapsed - piece.startAt > 0.35 &&
        piece.seenAt !== null &&
        Math.abs(event.contact.getImpactVelocityAlongNormal()) > 75
      )
        impacts.add(piece.id);
    });
    pieces.set(piece.id, piece);
    return piece;
  }
  models.forEach((model, index) => {
    const { width: w, height: h, top } = model.rect;
    const cut = height - top;
    const startAt = random() * 0.7 + index * 0.035;
    if (cut >= 2 && cut <= h - 2) {
      add(index, { x: 0, y: 0, width: w, height: cut }, 0, startAt);
      add(index, { x: 0, y: cut, width: w, height: h - cut }, 0, startAt + 0.25);
    } else add(index, { x: 0, y: 0, width: w, height: h }, 0, startAt);
  });

  function remove(piece) {
    if (piece.active) world.removeBody(piece.body);
    pieces.delete(piece.id);
    impacts.delete(piece.id);
  }
  function fracture(piece) {
    const capacity = pieceLimit - pieces.size + 1;
    if (piece.depth >= 2 || piece.region.width < 8 || piece.region.height < 6 || capacity < 2) {
      piece.depth = 2;
      piece.seenAt = elapsed - piece.fadeAfter;
      return;
    }
    const { x, y, width: w, height: h } = piece.region;
    const across = w * (0.32 + random() * 0.36);
    const down = h * (0.32 + random() * 0.36);
    const regions =
      capacity >= 4 && w > 16 && h > 12
        ? [
            { x, y, width: across, height: down },
            { x: x + across, y, width: w - across, height: down },
            { x, y: y + down, width: across, height: h - down },
            { x: x + across, y: y + down, width: w - across, height: h - down },
          ]
        : w >= h
          ? [
              { x, y, width: across, height: h },
              { x: x + across, y, width: w - across, height: h },
            ]
          : [
              { x, y, width: w, height: down },
              { x, y: y + down, width: w, height: h - down },
            ];
    remove(piece);
    for (const region of regions) add(piece.model, region, piece.depth + 1, elapsed, piece);
  }
  function advance(seconds) {
    if (disposed || !pieces.size || !Number.isFinite(seconds) || seconds <= 0) return;
    remainder += Math.min(0.05, seconds);
    while (remainder + 1e-9 >= step && pieces.size) {
      remainder = Math.max(0, remainder - step);
      elapsed += step;
      if (elapsed >= 24) {
        for (const piece of pieces.values()) remove(piece);
        break;
      }
      for (const piece of pieces.values()) {
        if (!piece.active && elapsed >= piece.startAt) {
          world.addBody(piece.body);
          piece.active = true;
        }
        if (!piece.active) continue;
        piece.body.velocity.y = Math.max(-480, piece.body.velocity.y);
        if (
          piece.seenAt === null &&
          piece.body.position.y - piece.region.height / 2 < height / 2 + 80
        )
          piece.seenAt = elapsed;
      }
      world.step(step);
      for (const { body } of pieces.values()) {
        body.angularVelocity.x = clamp(body.angularVelocity.x, -4, 4);
        body.angularVelocity.y = clamp(body.angularVelocity.y, -4, 4);
        body.angularVelocity.z = clamp(body.angularVelocity.z, -4, 4);
      }
      // Fracture adds children: visit only the pre-step generation.
      for (const piece of Array.from(pieces.values())) {
        if (!piece.active || piece.seenAt === null) continue;
        const age = elapsed - piece.seenAt;
        if (piece.depth < 2 && (age >= piece.shatterAfter || impacts.has(piece.id))) {
          fracture(piece);
          continue;
        }
        if (piece.depth === 2) {
          const fade = clamp((age - piece.fadeAfter) / 1.1, 0, 1);
          piece.opacity = 1 - fade;
          piece.scale = 1 - fade * 0.45;
          if (fade === 1) remove(piece);
        }
      }
      impacts.clear();
    }
  }
  function dispose() {
    if (disposed) return;
    for (const piece of pieces.values()) remove(piece);
    for (const wall of [floor, back, front]) world.removeBody(wall);
    world.contacts.length = 0;
    impacts.clear();
    disposed = true;
  }
  return {
    pieces,
    advance,
    resize,
    dispose,
    get done() {
      return !pieces.size;
    },
    get elapsed() {
      return elapsed;
    },
  };
}
