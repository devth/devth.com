import { studyFrame } from "./hover-studies.js";
import { createGrowth } from "./organic-growth.js";
import { chooseStructure, getHoverPreferences } from "./hover-preferences.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const namespace = "http://www.w3.org/2000/svg";
const layers = ["back", "front", "accent"];

// Heading holds and ordinary link hovers retain independent lifetimes.
export function createSigil({ className = "link-sigil", follow = false } = {}) {
  const sigil = document.createElementNS(namespace, "svg");
  sigil.classList.add(className);
  sigil.setAttribute("aria-hidden", "true");
  sigil.setAttribute("focusable", "false");
  sigil.setAttribute("hidden", "");
  const original = document.createElementNS(namespace, "g");
  const branches = document.createElementNS(namespace, "g");
  const paths = [original, branches].map((group) =>
    layers.map((layer) => {
      const path = document.createElementNS(namespace, "path");
      path.classList.add(`study-${layer}`);
      group.append(path);
      return path;
    }),
  );
  sigil.append(original, branches);
  document.body.append(sigil);
  let activeLink;
  let frame = 0;
  let hideTimer = 0;
  let range;
  let bounds;
  let generating = false;

  function clear(fade = false) {
    if (fade && !activeLink) return;
    cancelAnimationFrame(frame);
    clearTimeout(hideTimer);
    frame = hideTimer = 0;
    activeLink?.classList.remove("link-distortion");
    activeLink = range = null;
    sigil.classList.remove("is-visible");
    if (fade && !motion.matches)
      hideTimer = setTimeout(() => sigil.setAttribute("hidden", ""), 180);
    else sigil.setAttribute("hidden", "");
  }
  function position(link) {
    const rect = (range || link.querySelector(".entry-title") || link).getBoundingClientRect();
    if (!link.isConnected || rect.bottom <= 0 || rect.top >= innerHeight) return false;
    const x = Math.min(innerWidth - 36, Math.max(36, follow ? rect.right + 42 : rect.right - 6));
    const y = Math.min(innerHeight - 36, Math.max(36, rect.top + rect.height / 2));
    const unit = 72 / 128;
    if (generating) {
      sigil.setAttribute("viewBox", `0 0 ${innerWidth} ${innerHeight}`);
      sigil.style.left = sigil.style.top = "0px";
      original.setAttribute("transform", `translate(${x} ${y}) scale(${unit})`);
      branches.setAttribute("transform", `translate(${x} ${y}) scale(${unit})`);
    } else {
      sigil.setAttribute("viewBox", "0 0 80 80");
      sigil.style.left = x - 36 + "px";
      sigil.style.top = y - 36 + "px";
      original.setAttribute("transform", "translate(40 40) scale(0.625)");
    }
    bounds = {
      left: -x / unit,
      right: (innerWidth - x) / unit,
      top: -y / unit,
      bottom: (innerHeight - y) / unit,
    };
    return true;
  }
  function paint(set, drawing) {
    set.forEach((path, index) => path.setAttribute("d", drawing[layers[index]]));
  }
  function draw(link) {
    if (activeLink === link) return;
    clear();
    if (
      motion.matches ||
      document.hidden ||
      link.classList.contains("skip-link") ||
      link.closest("dialog") ||
      document.querySelector("dialog[open]")
    )
      return;
    const preferences = getHoverPreferences();
    generating = preferences.generation;
    sigil.toggleAttribute("data-generating", generating);
    const id = chooseStructure(preferences.structure);
    sigil.dataset.structure = id;
    if (follow) {
      range = document.createRange();
      range.selectNodeContents(link);
    }
    if (!position(link)) {
      range = null;
      return;
    }
    activeLink = link;
    link.classList.add("link-distortion");
    const growth = generating ? createGrowth(id, Math.floor(Math.random() * 0x100000000)) : null;
    delete sigil.dataset.growthRoots;
    const phase = Math.random() * 20;
    let age = 0;
    let last = performance.now();
    let painted = -Infinity;
    let grown = 0;
    paint(paths[1], { back: "", front: "", accent: "" });
    sigil.removeAttribute("hidden");
    if (follow) sigil.getBoundingClientRect();
    sigil.classList.add("is-visible");
    function animate(now) {
      if (
        !activeLink ||
        motion.matches ||
        document.hidden ||
        document.querySelector("dialog[open]") ||
        (follow && !position(activeLink))
      ) {
        clear();
        return;
      }
      age += Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (now - painted >= 1000 / 30) {
        paint(paths[0], studyFrame(id, phase + age));
        if (generating) {
          growth.advance(age - grown, bounds);
          grown = age;
          const drawing = growth.frame();
          paint(paths[1], drawing);
          sigil.dataset.growthRoots = drawing.roots;
        }
        painted = now;
      }
      frame = requestAnimationFrame(animate);
    }
    animate(last);
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") clear();
  });
  window.addEventListener("hover-preferenceschange", () => {
    const target = activeLink;
    clear();
    if (target) draw(target);
  });
  return {
    draw,
    clear,
    get target() {
      return activeLink;
    },
  };
}

const linkSigil = createSigil();
export const clearSigil = () => linkSigil.clear();
export const drawSigil = (link) => {
  // A visible destination owns the art; otherwise its ToC link can preview it.
  const heading = link.matches("[data-toc] a")
    ? document.getElementById(decodeURIComponent(link.hash.slice(1)))
    : null;
  const bounds = heading?.getBoundingClientRect();
  if (
    link.matches(".prose .header-anchor") ||
    (bounds && bounds.bottom > 0 && bounds.top < innerHeight)
  ) {
    clearSigil();
    return;
  }
  linkSigil.draw(link);
};
document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const link = event.target.closest("a");
  if (link && !link.contains(event.relatedTarget)) drawSigil(link);
});
document.addEventListener("pointerout", (event) => {
  const link = linkSigil.target;
  if (link?.contains(event.target) && !link.contains(event.relatedTarget)) clearSigil();
});
document.addEventListener("focusin", (event) => {
  const link = event.target.closest("a");
  if (link) drawSigil(link);
});
document.addEventListener("focusout", clearSigil);
document.addEventListener("scroll", clearSigil, { passive: true, capture: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearSigil();
});
window.addEventListener("blur", clearSigil);
window.addEventListener("resize", clearSigil);
window.addEventListener("pagehide", clearSigil);
motion.addEventListener("change", clearSigil);
