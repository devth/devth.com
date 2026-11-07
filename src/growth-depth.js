import { Group, DoubleSide, Color } from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

/** Append-only, depth-tested ink. Sealed chunks never upload again; only live
 * tips change. Retention changes instance counts, not previously drawn vertices. */
export function createDepthInk(parent, normal, accent) {
  const root = new Group();
  parent.add(root);
  // Keep front-facing ink distinguishable from the same-colored solid face.
  const inkColor = (value) => {
    const color = new Color(value);
    return color.r + color.g + color.b > 1.5
      ? color.multiplyScalar(0.28)
      : color.lerp(new Color("white"), 0.13);
  };
  const materials = [inkColor(normal), accent].map(
    (color, index) =>
      new LineMaterial({
        color,
        linewidth: index ? 1.2 : 0.75,
        alphaToCoverage: true,
        side: DoubleSide,
        resolution: { x: globalThis.innerWidth || 1440, y: globalThis.innerHeight || 1000 },
      }),
  );
  const chunks = [],
    current = [],
    live = [];
  let total = 0,
    previousRetention = 1;
  function make(channel, capacity, retained) {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(new Float32Array(capacity * 6));
    geometry.instanceCount = 0;
    const mesh = new LineSegments2(geometry, materials[channel]);
    mesh.frustumCulled = false;
    root.add(mesh);
    return {
      mesh,
      geometry,
      capacity,
      count: 0,
      indices: retained ? new Float64Array(capacity) : null,
      data: geometry.attributes.instanceStart.data,
    };
  }
  function sample(curve, write) {
    const at = (t) =>
      curve.start.map(
        (v, axis) =>
          v * (1 - t) ** 2 + 2 * curve.control[axis] * t * (1 - t) + curve.end[axis] * t * t,
      );
    let previous = curve.start;
    for (let step = 1; step <= 8; step++) {
      const next = at(step / 8);
      write(previous, next);
      previous = next;
    }
  }
  function append(curves) {
    const dirty = new Set();
    for (const curve of curves) {
      const channel = curve.accent ? 1 : 0;
      sample(curve, (a, b) => {
        let chunk = current[channel];
        if (!chunk || chunk.count === chunk.capacity) {
          chunk = current[channel] = make(channel, 1024, true);
          chunks.push(chunk);
        }
        chunk.data.array.set([...a, ...b], chunk.count * 6);
        chunk.indices[chunk.count++] = total++;
        chunk.geometry.instanceCount = chunk.count;
        dirty.add(chunk);
      });
    }
    for (const chunk of dirty) chunk.data.needsUpdate = true;
  }
  function setLive(curves) {
    const channels = [[], []];
    for (const curve of curves) channels[curve.accent ? 1 : 0].push(curve);
    channels.forEach((curves, channel) => {
      const needed = curves.length * 8;
      let chunk = live[channel];
      if (!chunk || chunk.capacity < needed) {
        if (chunk) {
          root.remove(chunk.mesh);
          chunk.geometry.dispose();
        }
        chunk = live[channel] = make(
          channel,
          Math.max(256, 2 ** Math.ceil(Math.log2(needed || 1))),
          false,
        );
      }
      chunk.count = 0;
      for (const curve of curves)
        sample(curve, (a, b) => {
          chunk.data.array.set([...a, ...b], chunk.count++ * 6);
        });
      chunk.geometry.instanceCount = chunk.count;
      if (chunk.count) chunk.data.needsUpdate = true;
    });
  }
  function retention(amount) {
    if (amount === 1 && previousRetention === 1) return;
    previousRetention = amount;
    const cutoff = Math.floor(total * Math.max(0, Math.min(1, amount)));
    for (const chunk of chunks) {
      let low = 0,
        high = chunk.count;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (chunk.indices[mid] < cutoff) low = mid + 1;
        else high = mid;
      }
      chunk.geometry.instanceCount = low;
    }
    for (const chunk of live)
      if (chunk) chunk.geometry.instanceCount = amount === 1 ? chunk.count : 0;
  }
  function palette(normal, accent) {
    materials[0].color.copy(inkColor(normal));
    materials[1].color.set(accent);
  }
  function dispose() {
    parent.remove(root);
    for (const chunk of [...chunks, ...live]) chunk?.geometry.dispose();
    for (const material of materials) material.dispose();
  }
  return { root, append, setLive, retention, palette, dispose };
}
