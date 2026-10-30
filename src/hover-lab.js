import { studyFrame } from "./hover-studies.js";

const board = document.querySelector("[data-hover-board]");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const compare = board.querySelector("[data-compare-all]");
const status = board.querySelector("[data-hover-status]");
board.querySelector("[data-hover-static]").hidden = true;
const states = [...board.querySelectorAll("[data-hover-study]")].map((element) => ({
  element,
  button: element.querySelector("button"),
  paths: [...element.querySelectorAll("path")],
  time: 0,
  visible: false,
  hovered: false,
  focused: false,
  held: false,
  running: false,
}));
let comparing = false;
let pageActive = true;
let frame = 0;
let last = 0;

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
    running ||= state.running;
  }
  if (running && !frame) frame = requestAnimationFrame(tick);
  if (!running) {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
}
function tick(now) {
  const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  for (const state of states)
    if (state.running) {
      state.time += delta;
      const paths = studyFrame(state.element.dataset.hoverStudy, state.time);
      state.paths.forEach((path, index) =>
        path.setAttribute("d", paths[["back", "front", "accent"][index]]),
      );
    }
  frame = requestAnimationFrame(tick);
}
function resetIntents() {
  for (const state of states) state.hovered = state.focused = state.held = false;
}
function updateControls() {
  compare.disabled = motion.matches;
  compare.setAttribute("aria-pressed", String(comparing));
  compare.textContent = comparing ? "Stop comparison" : "Compare all";
  status.textContent = motion.matches
    ? "Reduced motion: static studies."
    : comparing
      ? "Comparing visible studies. Stop comparison to return to individual previews."
      : "Hover or focus a study. Click or tap to hold; again to stop.";
  refresh();
}
for (const state of states) {
  state.button.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") {
      state.hovered = true;
      refresh();
    }
  });
  state.button.addEventListener("pointerleave", () => {
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
    // A second tap must stop even while the button retains DOM focus.
    state.hovered = state.focused = false;
    refresh();
  });
}
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const state = states.find((state) => state.element === entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.05;
    }
    refresh();
  },
  { threshold: [0, 0.05] },
);
states.forEach((state) => observer.observe(state.element));
compare.hidden = false;
compare.addEventListener("click", () => {
  comparing = !comparing;
  if (!comparing) resetIntents();
  updateControls();
});
motion.addEventListener("change", () => {
  comparing = false;
  resetIntents();
  updateControls();
});
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
  refresh();
});
updateControls();
