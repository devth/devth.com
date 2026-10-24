import { project, glyphPath, shapeCount } from "../src/graph-geometry.js";

let seed = 81473;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const nodes = Array.from({ length: 44 }, () => ({
  x: Math.round(random() * 1600 - 800),
  y: Math.round(random() * 1160 - 580),
  z: Math.round((random() - 0.5) * 900),
  size: (0.6 + random() * 0.8).toFixed(2),
  shape: Math.floor(random() * shapeCount),
}));
const projected = nodes.map((node) => project(node));
const edges = new Set();
nodes.forEach((node, i) => {
  nodes
    .map((other, j) => ({
      j,
      distance: Math.hypot(node.x - other.x, node.y - other.y, node.z - other.z),
    }))
    .filter(({ j }) => j !== i)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .forEach(({ j }) => edges.add([Math.min(i, j), Math.max(i, j)].join("-")));
});
export const background = `<svg class="page-graph" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>${Array.from({ length: shapeCount }, (_, shape) => `<path id="page-graph-glyph-${shape}" d="${glyphPath(0, 0, shape)}"/>`).join("")}</defs>
  <g class="graph-edges">${[...edges]
    .map((edge) => {
      const [a, b] = edge.split("-").map(Number);
      return `<line data-from="${a}" data-to="${b}" x1="${projected[a].x.toFixed(2)}" y1="${projected[a].y.toFixed(2)}" x2="${projected[b].x.toFixed(2)}" y2="${projected[b].y.toFixed(2)}"/>`;
    })
    .join("")}</g>
  <g class="graph-nodes">${nodes.map(({ x, y, z, size, shape }, i) => `<g class="graph-node" data-x="${x}" data-y="${y}" data-z="${z}" transform="translate(${projected[i].x.toFixed(2)} ${projected[i].y.toFixed(2)}) scale(${projected[i].scale.toFixed(3)})"><use href="#page-graph-glyph-${shape}" transform="scale(${size})"/></g>`).join("")}</g>
</svg>`;
