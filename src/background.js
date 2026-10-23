import { project, glyphPath } from "./graph-geometry.js";

const graph = document.querySelector(".page-graph");
if (graph) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const glyphs = [...graph.querySelectorAll("defs path")];
  const nodes = [...graph.querySelectorAll(".graph-node")].map((element) => ({
    element,
    x: Number(element.dataset.x),
    y: Number(element.dataset.y),
    z: Number(element.dataset.z),
    dx: 0,
    dy: 0,
  }));
  const edges = [...graph.querySelectorAll("line")].map((element) => ({
    element,
    a: nodes[Number(element.dataset.from)],
    b: nodes[Number(element.dataset.to)],
  }));
  let lastY = scrollY;
  let queued = false;
  let pitch = 0;
  let yaw = 0;
  const clamp = (value) => Math.max(-18, Math.min(18, value));
  function shift() {
    queued = false;
    const delta = scrollY - lastY;
    lastY = scrollY;
    if (!delta || motion.matches || document.hidden) return;
    const distance = Math.max(-160, Math.min(160, delta));
    yaw = (yaw + distance * 0.00045) % (Math.PI * 2);
    pitch = Math.max(-0.35, Math.min(0.35, pitch + distance * 0.00018));
    const step = Math.min(Math.abs(delta), 100) * 0.065;
    for (const node of nodes) {
      if (Math.random() < 0.3) {
        node.dx = clamp(node.dx + (Math.random() - 0.5) * step);
        node.dy = clamp(node.dy + (Math.random() - 0.5) * step);
      }
      node.projected = project({ x: node.x + node.dx, y: node.y + node.dy, z: node.z }, pitch, yaw);
      const { x, y, scale } = node.projected;
      node.element.setAttribute(
        "transform",
        "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ") scale(" + scale.toFixed(3) + ")",
      );
    }
    glyphs.forEach((glyph, shape) => glyph.setAttribute("d", glyphPath(pitch, yaw, shape)));
    for (const { element, a, b } of edges) {
      element.setAttribute("x1", a.projected.x.toFixed(2));
      element.setAttribute("y1", a.projected.y.toFixed(2));
      element.setAttribute("x2", b.projected.x.toFixed(2));
      element.setAttribute("y2", b.projected.y.toFixed(2));
    }
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(shift);
      }
    },
    { passive: true },
  );
}
