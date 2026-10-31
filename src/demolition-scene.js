import { Scene, PerspectiveCamera } from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { createDemolitionPhysics } from "./demolition-physics.js";
import { releasePiece } from "./demolition-capture.js";
export { capturePage } from "./demolition-capture.js";

export function createScene(capture, host, onDone) {
  const scope = new AbortController();
  const scene = new Scene();
  const camera = new PerspectiveCamera(360 / 7, 1, 1, 10_000);
  const renderer = new CSS3DRenderer();
  const objects = new Map();
  const physics = createDemolitionPhysics(capture.models, host.clientWidth, host.clientHeight);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.inert = true;
  let width, height;
  let frame = 0;
  let last = 0;
  let nextPaint = 0;
  let visibleTime = 0;
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
  function paint() {
    for (const [id, object] of objects) if (!physics.pieces.has(id)) remove(id, object);
    for (const piece of physics.pieces.values()) {
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
    for (const [id, object] of objects) remove(id, object);
    renderer.domElement.remove();
    capture.dispose();
  }
  function finish() {
    if (!disposed) {
      dispose();
      onDone();
    }
  }
  function tick(now) {
    frame = 0;
    if (disposed || document.hidden) return;
    if (now + 0.5 < nextPaint) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const seconds = last ? (now - last) / 1000 : 0;
    visibleTime += seconds;
    physics.advance(seconds);
    last = now;
    nextPaint = now + 1000 / 30;
    if (visibleTime > 23) host.style.opacity = Math.max(0, 24 - visibleTime);
    paint();
    if (physics.done || visibleTime >= 24) {
      finish();
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    nextPaint = 0;
    if (!document.hidden && !disposed) frame = requestAnimationFrame(tick);
  }
  try {
    resize();
    paint();
    window.addEventListener("resize", resize, { signal: scope.signal });
    window.visualViewport?.addEventListener("resize", resize, { signal: scope.signal });
    document.addEventListener("visibilitychange", visibility, { signal: scope.signal });
    frame = requestAnimationFrame(tick);
  } catch (error) {
    dispose();
    throw error;
  }
  return { dispose, finish };
}
