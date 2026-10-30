import { studyFrame } from "./hover-studies.js";
import { growthFrame } from "./organic-growth.js";

const board = document.querySelector("[data-hover-board]");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const compare = board.querySelector("[data-compare-all]");
const toggle = board.querySelector("[data-generator-toggle]");
const reset = board.querySelector("[data-reset-growth]");
const status = board.querySelector("[data-hover-status]");
const layers = ["back", "front", "accent"];
const namespace = "http://www.w3.org/2000/svg";
board.querySelector("[data-hover-static]").hidden = true;
const states = [...board.querySelectorAll("[data-hover-study]")].map((element, index) => ({
  element,
  id: element.dataset.hoverStudy,
  button: element.querySelector("button"),
  svg: element.querySelector("svg"),
  paths: [...element.querySelectorAll("path")],
  seed: index,
  time: 0,
  age: 0,
  visible: false,
  hovered: false,
  focused: false,
  held: false,
  running: false,
  garden: null,
}));
let comparing = false;
let generating = false;
let pageActive = true;
let frame = 0;
let last = 0;
let painted = 0;
let garden;
let seed = 0;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(namespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}
function pathSet(parent) {
  return layers.map((layer) => {
    const path = svgElement("path", { class: `study-${layer}` });
    parent.append(path);
    return path;
  });
}
function paint(paths, drawing) {
  paths.forEach((path, index) => path.setAttribute("d", drawing[layers[index]]));
}
function position(state) {
  if (!state.garden) return;
  const rect = state.svg.getBoundingClientRect();
  state.garden.root.setAttribute(
    "transform",
    `translate(${rect.x + rect.width / 2} ${rect.y + rect.height / 2})`,
  );
  state.garden.unit = rect.width / 128;
}
function ensureGarden(state) {
  if (!garden) {
    garden = svgElement("svg", {
      class: "hover-growth-layer",
      "data-growth-layer": "",
      "aria-hidden": "true",
      focusable: "false",
      viewBox: `0 0 ${innerWidth} ${innerHeight}`,
    });
    board.append(garden);
  }
  if (!state.garden) {
    const root = svgElement("g", { "data-growth-study": state.id });
    const original = svgElement("g");
    const branches = svgElement("g", { "data-growth-branches": "" });
    root.append(original, branches);
    garden.append(root);
    state.garden = {
      root,
      original,
      branches,
      basePaths: pathSet(original),
      branchPaths: pathSet(branches),
    };
    position(state);
  }
  state.element.dataset.grown = "true";
}
function refresh() {
  let running = false;
  for (const state of states) {
    state.button.disabled = motion.matches;
    state.running =
      !motion.matches &&
      !document.hidden &&
      pageActive &&
      state.visible &&
      (comparing || state.hovered || state.focused || state.held);
    state.element.dataset.running = String(state.running);
    state.button.setAttribute("aria-pressed", String(state.running));
    if (state.garden) state.garden.root.style.display = state.visible ? "" : "none";
    running ||= state.running;
  }
  if (garden) garden.style.display = generating && !document.hidden ? "" : "none";
  reset.hidden = !generating || !states.some((state) => state.age > 0);
  if (running && !frame) frame = requestAnimationFrame(tick);
  if (!running) {
    cancelAnimationFrame(frame);
    frame = last = painted = 0;
  }
}
function tick(now) {
  const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  // Full-screen growth redraws at 30fps; there are always just six paths per
  // specimen. Procedural detail rolls forward rather than retaining a tree.
  const redraw = !generating || now - painted >= 1000 / 30;
  for (const state of states) {
    if (!state.running) continue;
    state.time += delta;
    if (generating) state.age += delta;
    if (!redraw) continue;
    const drawing = studyFrame(state.id, state.time);
    if (generating) {
      ensureGarden(state);
      const scale = state.garden.unit * (1 + state.age ** 2 * 1.2);
      state.garden.original.setAttribute("transform", `scale(${scale})`);
      state.garden.branches.setAttribute("transform", `scale(${state.garden.unit})`);
      paint(state.garden.basePaths, drawing);
      paint(state.garden.branchPaths, growthFrame(state.id, state.age, state.seed));
    } else paint(state.paths, drawing);
  }
  if (redraw) painted = now;
  if (generating) reset.hidden = !states.some((state) => state.age > 0);
  frame = requestAnimationFrame(tick);
}
function resetIntents() {
  for (const state of states) state.hovered = state.focused = state.held = false;
}
function clearGrowth() {
  seed++;
  for (const state of states) {
    state.age = 0;
    state.seed = seed * 31 + states.indexOf(state);
    state.garden = null;
    state.element.dataset.grown = "false";
    paint(state.paths, studyFrame(state.id, state.time));
  }
  garden?.replaceChildren();
}
function updateControls() {
  compare.disabled = toggle.disabled = motion.matches;
  compare.setAttribute("aria-pressed", String(comparing));
  compare.textContent = comparing ? "Stop comparison" : "Compare all";
  toggle.setAttribute("aria-checked", String(generating));
  status.textContent = motion.matches
    ? "Reduced motion: static studies."
    : generating
      ? "Hover a glyph or its name to grow. Leave to pause; return to keep growing. Escape clears growth."
      : comparing
        ? "Comparing visible studies. Stop comparison to return to individual previews."
        : "Hover a glyph or its name. Click or tap to hold; again to stop.";
  refresh();
}
function stopAndClear() {
  comparing = false;
  resetIntents();
  clearGrowth();
  updateControls();
}
for (const state of states) {
  // The whole figure is one hover region: crossing from glyph to caption must
  // not interrupt growth. Its label also activates the same native button.
  state.element.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") {
      state.hovered = true;
      refresh();
    }
  });
  state.element.addEventListener("pointerleave", () => {
    state.hovered = false;
    refresh();
  });
  state.button.addEventListener("focus", () => {
    state.focused = true;
    refresh();
  });
  state.button.addEventListener("blur", () => {
    state.focused = false;
    refresh();
  });
  state.button.addEventListener("click", () => {
    state.held = !state.held;
    // A second tap stops even while the button retains DOM focus.
    state.hovered = state.focused = false;
    refresh();
  });
}
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const state = states.find((state) => state.element === entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.05;
      position(state);
    }
    refresh();
  },
  { threshold: [0, 0.05] },
);
states.forEach((state) => observer.observe(state.element));
compare.hidden = toggle.hidden = false;
compare.addEventListener("click", () => {
  comparing = !comparing;
  if (!comparing) resetIntents();
  updateControls();
});
toggle.addEventListener("click", () => {
  generating = !generating;
  resetIntents();
  clearGrowth();
  reposition();
  updateControls();
});
reset.addEventListener("click", stopAndClear);
document.addEventListener("keydown", (event) => {
  if (generating && event.key === "Escape" && !event.defaultPrevented) stopAndClear();
});
motion.addEventListener("change", () => {
  generating = comparing = false;
  resetIntents();
  clearGrowth();
  updateControls();
});
function reposition() {
  if (!generating || document.hidden) return;
  garden?.setAttribute("viewBox", `0 0 ${innerWidth} ${innerHeight}`);
  for (const state of states) if (state.visible) position(state);
}
window.addEventListener("scroll", reposition, { passive: true });
window.addEventListener("resize", reposition);
document.addEventListener("visibilitychange", refresh);
window.addEventListener("blur", () => {
  pageActive = false;
  refresh();
});
window.addEventListener("focus", () => {
  pageActive = true;
  refresh();
});
window.addEventListener("pagehide", () => {
  pageActive = false;
  refresh();
});
window.addEventListener("pageshow", () => {
  pageActive = true;
  reposition();
  refresh();
});
updateControls();
