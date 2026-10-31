// At most 750 frames × 160 pieces × 10 floats: 4.8 MB of transform data.
// Keep the origin even if a slow/irregular clock reaches the frame cap.
export function createHistory() {
  const frames = [];
  const shapes = new Map();
  return {
    record(time, pieces, opacity = 1) {
      const data = new Float32Array(pieces.size * 10);
      let offset = 0;
      for (const piece of pieces.values()) {
        shapes.set(piece.id, { model: piece.model, region: piece.region });
        const { position: p, quaternion: q } = piece.body;
        data.set([piece.id, p.x, p.y, p.z, q.x, q.y, q.z, q.w, piece.opacity, piece.scale], offset);
        offset += 10;
      }
      frames.push({ time, opacity, data });
      if (frames.length > 750) frames.splice(1, 1);
    },
    at(time) {
      let low = 0,
        high = frames.length - 1;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (frames[middle].time <= time) low = middle;
        else high = middle - 1;
      }
      const frame = frames[low];
      const pieces = new Map();
      if (!frame) return { pieces, opacity: 1 };
      for (let i = 0; i < frame.data.length; i += 10) {
        const [id, x, y, z, qx, qy, qz, qw, opacity, scale] = frame.data.subarray(i, i + 10);
        pieces.set(id, {
          id,
          ...shapes.get(id),
          body: { position: { x, y, z }, quaternion: { x: qx, y: qy, z: qz, w: qw } },
          opacity,
          scale,
        });
      }
      return { pieces, opacity: frame.opacity };
    },
    get duration() {
      return frames.at(-1)?.time ?? 0;
    },
    get length() {
      return frames.length;
    },
    dispose() {
      frames.length = 0;
      shapes.clear();
    },
  };
}
