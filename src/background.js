const graph = document.querySelector(".page-graph");
if (graph) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = [...graph.querySelectorAll(".graph-node")].map((element) => ({
    element,
    x: Number(element.dataset.x),
    y: Number(element.dataset.y),
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
  const clamp = (value) => Math.max(-10, Math.min(10, value));
  function shift() {
    queued = false;
    const delta = scrollY - lastY;
    lastY = scrollY;
    if (!delta || motion.matches || document.hidden) return;
    const step = Math.min(Math.abs(delta), 80) * 0.025;
    for (const node of nodes) {
      if (Math.random() > 0.3) continue;
      node.dx = clamp(node.dx + (Math.random() - 0.5) * step);
      node.dy = clamp(node.dy + (Math.random() - 0.5) * step);
      node.element.setAttribute(
        "transform",
        "translate(" + (node.x + node.dx).toFixed(2) + " " + (node.y + node.dy).toFixed(2) + ")",
      );
    }
    for (const { element, a, b } of edges) {
      element.setAttribute("x1", (a.x + a.dx).toFixed(2));
      element.setAttribute("y1", (a.y + a.dy).toFixed(2));
      element.setAttribute("x2", (b.x + b.dx).toFixed(2));
      element.setAttribute("y2", (b.y + b.dy).toFixed(2));
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
