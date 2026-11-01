import { Scene, PerspectiveCamera } from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { createDemolitionPhysics } from "./demolition-physics.js";
import { createHistory } from "./demolition-history.js";
import { releasePiece } from "./demolition-capture.js";
export { capturePage } from "./demolition-capture.js";

export function createScene(capture, host, onDone) {
  const scope = new AbortController();
  const scene = new Scene();
  const camera = new PerspectiveCamera(360 / 7, 1, 1, 10_000);
  const renderer = new CSS3DRenderer();
  const objects = new Map();
  const physics = createDemolitionPhysics(capture.models, host.clientWidth, host.clientHeight);
  const history = createHistory();
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.inert = true;
  let width, height;
  let frame = 0;
  let last = 0;
  let nextPaint = 0;
  let nextRecord = 1 / 30;
  let visibleTime = 0;
  let cursor = 0;
  let reverseSpeed = 2;
  let phase = "forward";
  let onRebuilt;
  let disposed = false;
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height || disposed) return;
    camera.aspect = width / height;
    camera.position.z = height / (2 * Math.tan(Math.PI / 7));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    physics.resize(width, height);
  }
  function remove(id, object) {
    scene.remove(object);
    releasePiece(object.element);
    objects.delete(id);
  }
  function paint(pieces = physics.pieces) {
    for (const [id, object] of objects) if (!pieces.has(id)) remove(id, object);
    for (const piece of pieces.values()) {
      const { body, region } = piece;
      const visible =
        body.position.y - region.height / 2 < height / 2 + 120 &&
        body.position.y + region.height / 2 > -height / 2 - 160 &&
        Math.abs(body.position.x) < width + region.width;
      let object = objects.get(piece.id);
      if (!object && visible) {
        const element = capture.models[piece.model].render(region);
        object = new CSS3DObject(element);
        element.style.pointerEvents = "none";
        objects.set(piece.id, object);
        scene.add(object);
      }
      if (!object) continue;
      object.visible = visible;
      object.position.copy(body.position);
      object.quaternion.copy(body.quaternion);
      object.scale.setScalar(piece.scale);
      object.element.style.opacity = piece.opacity;
    }
    renderer.render(scene, camera);
    for (const element of host.querySelectorAll("[data-demolition-scroll]")) {
      const [left, top] = JSON.parse(element.dataset.demolitionScroll);
      element.scrollLeft = left;
      element.scrollTop = top;
      delete element.dataset.demolitionScroll;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    scope.abort();
    physics.dispose();
    history.dispose();
    for (const [id, object] of objects) remove(id, object);
    renderer.domElement.remove();
    capture.dispose();
  }
  function finish() {
    if (disposed || phase !== "forward") return;
    phase = "done";
    physics.dispose();
    for (const [id, object] of objects) remove(id, object);
    renderer.domElement.remove();
    onDone();
  }
  function reverse(callback, duration) {
    if (disposed || phase === "reverse") return;
    if (phase === "forward")
      history.record(visibleTime, physics.pieces, Number(host.style.opacity || 1));
    phase = "reverse";
    onRebuilt = callback;
    cursor = history.duration;
    reverseSpeed = duration > 0 ? Math.max(2, cursor / duration) : 2;
    physics.dispose();
    host.append(renderer.domElement);
    visibility();
  }
  function tick(now) {
    frame = 0;
    if (disposed || document.hidden) return;
    if (now + 0.5 < nextPaint) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const seconds = last ? (now - last) / 1000 : 0;
    last = now;
    nextPaint = Math.max(nextPaint + 1000 / 60, now);
    if (phase === "reverse") {
      // Replay the actual collisions and fractures; a released hold zips back in 250ms.
      cursor = Math.max(0, cursor - seconds * reverseSpeed);
      const snapshot = history.at(cursor);
      host.style.opacity = snapshot.opacity;
      paint(snapshot.pieces);
      if (cursor === 0) {
        onRebuilt();
        return;
      }
    } else {
      visibleTime += seconds;
      physics.advance(seconds);
      const opacity = visibleTime > 23 ? Math.max(0, 24 - visibleTime) : 1;
      host.style.opacity = opacity;
      const done = physics.done || visibleTime >= 24;
      // Smooth display frames without doubling the bounded rewind recording.
      if (visibleTime + 1e-6 >= nextRecord || done) {
        history.record(visibleTime, physics.pieces, opacity);
        nextRecord = (Math.floor((visibleTime + 1e-6) * 30) + 1) / 30;
      }
      paint();
      if (done) {
        finish();
        return;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    nextPaint = 0;
    if (!document.hidden && !disposed && phase !== "done") frame = requestAnimationFrame(tick);
  }
  try {
    resize();
    history.record(0, physics.pieces);
    paint();
    window.addEventListener("resize", resize, { signal: scope.signal });
    window.visualViewport?.addEventListener("resize", resize, { signal: scope.signal });
    document.addEventListener("visibilitychange", visibility, { signal: scope.signal });
    frame = requestAnimationFrame(tick);
  } catch (error) {
    dispose();
    throw error;
  }
  return { dispose, reverse };
}
