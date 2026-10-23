let seed = 81473;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const nodes = Array.from({ length: 44 }, () => ({
  x: Math.round(random() * 1600 - 80),
  y: Math.round(random() * 1160 - 80),
  size: (0.6 + random() * 0.8).toFixed(2),
}));
const edges = new Set();
nodes.forEach((node, i) => {
  nodes
    .map((other, j) => ({ j, distance: Math.hypot(node.x - other.x, node.y - other.y) }))
    .filter(({ j }) => j !== i)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .forEach(({ j }) => edges.add([Math.min(i, j), Math.max(i, j)].join("-")));
});
export const background = `<svg class="page-graph" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <g class="graph-edges">${[...edges]
    .map((edge) => {
      const [a, b] = edge.split("-").map(Number);
      return `<line data-from="${a}" data-to="${b}" x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}"/>`;
    })
    .join("")}</g>
  <g class="graph-nodes">${nodes.map(({ x, y, size }) => `<g class="graph-node" data-x="${x}" data-y="${y}" transform="translate(${x} ${y})"><path transform="scale(${size})" d="M0-7 7 0 0 7-7 0Z M0-7 3 3-7 0 0-7 M7 0 3 3 0 7 M0-7 0 7"/></g>`).join("")}</g>
</svg>`;
