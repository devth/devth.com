import { hoverTarget, hoverRegion } from "./hover-target.js";
import { onPage } from "./page-lifecycle.js";
import { studyFrame, studyDrawDuration } from "./hover-studies.js";
import { createGrowth } from "./organic-growth.js";
import { glyphContours, weaveFrame } from "./logo-weave.js";
import { chooseStructure, getHoverPreferences } from "./hover-preferences.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const contrast = matchMedia("(forced-colors: active)");
const namespace = "http://www.w3.org/2000/svg";
const layers = ["back", "front", "accent"];
const unit = 72 / 128;
let nextKey = 0;
let pageFocused = true;
const liveEffects = new Set();

// Heading holds and ordinary link hovers retain independent lifetimes.
function createEffect({ className, follow, finished }) {
  const sigil = document.createElementNS(namespace, "svg");
  sigil.classList.add(className);
  const rear = document.createElementNS(namespace, "svg");
  rear.classList.add("sigil-rear");
  rear.toggleAttribute("data-follow", follow);
  const surfaces = [sigil, rear];
  const key = String(++nextKey);
  for (const surface of surfaces) {
    surface.dataset.sigilKey = key;
    surface.setAttribute("aria-hidden", "true");
    surface.setAttribute("focusable", "false");
    surface.setAttribute("hidden", "");
  }
  const rearOriginal = document.createElementNS(namespace, "g");
  const rearBranches = document.createElementNS(namespace, "g");
  rear.append(rearOriginal, rearBranches);
  const original = document.createElementNS(namespace, "g");
  const branches = document.createElementNS(namespace, "g");
  const paths = [original, branches].map((group) =>
    layers.map((layer) => {
      const path = document.createElementNS(namespace, "path");
      path.classList.add(`study-${layer}`);
      (layer === "back" ? (group === original ? rearOriginal : rearBranches) : group).append(path);
      return path;
    }),
  );
  sigil.append(original, branches);
  document.body.append(rear, sigil);
  let activeLink;
  let frame = 0;
  let hideTimer = 0;
  let range;
  let bounds;
  let generating = false;
  let logo, logoLayout, logoOrigin;
  let glyphs = [];
  let unwind,
    run,
    timerAction,
    timerDeadline = 0,
    pausedAt = null;
  const release = () => unwind?.();

  function schedule(action, delay) {
    timerAction = action;
    timerDeadline = performance.now() + delay;
    hideTimer = setTimeout(() => {
      timerAction = null;
      action();
    }, delay);
  }
  function finish() {
    liveEffects.delete(api);
    run = timerAction = null;
    for (const surface of surfaces) surface.setAttribute("hidden", "");
    finished(api);
  }
  function clear(fade = false) {
    if (fade && !activeLink) return;
    cancelAnimationFrame(frame);
    clearTimeout(hideTimer);
    frame = hideTimer = 0;
    unwind = run = timerAction = null;
    pausedAt = null;
    original.style.opacity = rearOriginal.style.opacity = "";
    activeLink?.classList.remove("link-distortion");
    activeLink = range = logo = null;
    logoLayout = null;
    glyphs = [];
    for (const surface of surfaces) {
      surface.classList.remove("is-visible");
      delete surface.dataset.logoGlyphs;
    }
    if (fade && !motion.matches) schedule(finish, 180);
    else finish();
  }
  function position(link) {
    const rect = (range || link.querySelector(".entry-title") || link).getBoundingClientRect();
    if (!link.isConnected || rect.bottom <= 0 || rect.top >= innerHeight) return false;
    const x = Math.min(innerWidth - 36, Math.max(36, follow ? rect.right + 42 : rect.right - 6));
    const y = Math.min(innerHeight - 36, Math.max(36, rect.top + rect.height / 2));
    if (logo) {
      logo = link.querySelector(".brand-mark");
      const box = logo.getBoundingClientRect();
      const layout = `${box.width}:${box.height}`;
      if (layout !== logoLayout) {
        glyphs = glyphContours(logo);
        logoLayout = layout;
        for (const surface of surfaces) surface.dataset.logoGlyphs = String(glyphs.length);
      }
      logoOrigin = [box.left - x, box.top - y];
    }
    for (const surface of surfaces) {
      surface.setAttribute(
        "viewBox",
        generating ? `0 0 ${innerWidth} ${innerHeight}` : "0 0 80 80",
      );
      surface.style.left = generating ? "0px" : x - 36 + "px";
      surface.style.top = generating ? "0px" : y - 36 + "px";
    }
    for (const group of [original, branches, rearOriginal, rearBranches])
      group.setAttribute(
        "transform",
        generating ? `translate(${x} ${y}) scale(${unit})` : "translate(40 40) scale(0.625)",
      );
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
      !pageFocused ||
      document.hidden ||
      link.classList.contains("skip-link") ||
      link.closest("dialog") ||
      document.querySelector("dialog[open]")
    )
      return;
    const preferences = getHoverPreferences();
    generating = preferences.generation;
    logo = generating && !contrast.matches ? link.querySelector(".brand-mark") : null;
    (generating ? rearOriginal : original).prepend(paths[0][0]);
    const id = chooseStructure(preferences.structure);
    for (const surface of surfaces) {
      surface.toggleAttribute("data-generating", generating);
      surface.dataset.structure = id;
    }
    const title = link.querySelector(".entry-title");
    if (follow || title) {
      range = document.createRange();
      range.selectNodeContents(title || link);
    }
    if (!position(link)) {
      range = null;
      return;
    }
    activeLink = link;
    liveEffects.add(api);
    link.classList.add("link-distortion");
    const growth = generating ? createGrowth(id, Math.floor(Math.random() * 0x100000000)) : null;
    delete sigil.dataset.growthRoots;
    const phase = Math.random() * 20;
    function seedFrame(time, progress) {
      const drawing = { ...studyFrame(id, time, progress) };
      if (glyphs.length) {
        const weave = weaveFrame(glyphs, progress, phase + time * 0.16, ([x, y]) => [
          (x + logoOrigin[0]) / unit,
          (y + logoOrigin[1]) / unit,
        ]);
        for (const layer of layers) drawing[layer] += weave[layer];
      }
      return drawing;
    }
    let age = 0;
    let last = performance.now();
    let painted = -Infinity;
    let grown = 0;
    paint(paths[1], { back: "", front: "", accent: "" });
    for (const surface of surfaces) surface.removeAttribute("hidden");
    if (follow) sigil.getBoundingClientRect();
    for (const surface of surfaces) surface.classList.add("is-visible");
    function animate(now) {
      frame = 0;
      if (!pageFocused || document.hidden) {
        api.pause();
        return;
      }
      if (
        !activeLink ||
        motion.matches ||
        document.querySelector("dialog[open]") ||
        !position(activeLink)
      ) {
        clear();
        return;
      }
      age += Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (now - painted >= 1000 / 30) {
        paint(paths[0], seedFrame(phase + age, Math.min(1, age / studyDrawDuration)));
        if (generating) {
          const growthAge = Math.max(0, age - studyDrawDuration);
          growth.advance(growthAge - grown, bounds);
          grown = growthAge;
          const drawing = growth.frame();
          paint(paths[1], drawing);
          sigil.dataset.growthRoots = drawing.roots;
        }
        painted = now;
      }
      frame = requestAnimationFrame(animate);
    }
    unwind = () => {
      if (!activeLink) return;
      if (motion.matches) {
        clear();
        return;
      }
      const target = activeLink;
      activeLink.classList.remove("link-distortion");
      activeLink = null;
      cancelAnimationFrame(frame);
      let started = performance.now();
      pausedAt = null;
      painted = -Infinity;
      schedule(() => {
        paint(paths[1], { back: "", front: "", accent: "" });
        clear();
      }, 800);
      function retract(now) {
        frame = 0;
        if (!pageFocused || document.hidden) {
          api.pause();
          return;
        }
        if (
          motion.matches ||
          document.querySelector("dialog[open]") ||
          ((follow || target.closest(".site-header")) && !position(target))
        ) {
          clear();
          return;
        }
        const progress = Math.min(1, (now - started) / 800);
        const remaining = 1 - progress * progress * (3 - 2 * progress);
        if (now - painted >= 1000 / 30) {
          if (growth) paint(paths[1], growth.frame(remaining));
          paint(
            paths[0],
            seedFrame(
              phase + age - Math.min(age, 0.8) * (1 - remaining),
              Math.min(1, age / studyDrawDuration) * remaining,
            ),
          );
          original.style.opacity = rearOriginal.style.opacity = String(remaining);
          painted = now;
        }
        frame = requestAnimationFrame(retract);
      }
      run = (now, gap) => {
        started += gap;
        retract(now);
      };
      retract(started);
    };
    run = (now) => {
      last = now;
      animate(now);
    };
    animate(last);
  }
  const api = {
    draw,
    clear,
    release,
    pause() {
      if (pausedAt !== null) return;
      pausedAt = performance.now();
      cancelAnimationFrame(frame);
      clearTimeout(hideTimer);
      frame = hideTimer = 0;
    },
    resume() {
      if (pausedAt === null) return;
      const now = performance.now(),
        gap = now - pausedAt;
      pausedAt = null;
      if (timerAction) schedule(timerAction, Math.max(0, timerDeadline + gap - now));
      run?.(now, gap);
    },
    get target() {
      return activeLink;
    },
    get visible() {
      return !sigil.hasAttribute("hidden");
    },
    retire() {
      for (const surface of surfaces) surface.dataset.retiring = "";
      release();
    },
    destroy() {
      clear();
      for (const surface of surfaces) surface.remove();
    },
  };
  return api;
}

export function createSigil({ className = "link-sigil", follow = false } = {}) {
  const retiring = new Set();
  const controller = new AbortController();
  const make = () =>
    createEffect({
      className,
      follow,
      finished(effect) {
        if (retiring.delete(effect)) effect.destroy();
      },
    });
  let current = make();
  function clear(fade = false) {
    current.clear(fade);
    if (!fade) for (const effect of retiring) effect.clear();
  }
  function draw(link) {
    if (current.target === link) return;
    if (current.visible) {
      const previous = current;
      retiring.add(previous);
      previous.retire();
      if (retiring.size > 12) retiring.values().next().value.destroy();
      current = make();
    }
    current.draw(link);
  }
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") clear();
    },
    { signal: controller.signal },
  );
  window.addEventListener(
    "hover-preferenceschange",
    () => {
      const target = current.target;
      clear();
      if (target) draw(target);
    },
    { signal: controller.signal },
  );
  return {
    draw,
    clear,
    release: () => current.release(),
    get target() {
      return current.target;
    },
    destroy() {
      controller.abort();
      clear();
      current.destroy();
    },
  };
}

const linkSigil = createSigil();
let yearPreview;
onPage(".archive", (archive, { on, dispose }) => {
  const owners = new Map();
  let active;
  function release() {
    active = null;
    for (const owner of owners.values()) owner.release();
  }
  function clear() {
    active = null;
    for (const owner of owners.values()) owner.clear();
  }
  function draw(year) {
    if (
      active === year ||
      !pageFocused ||
      motion.matches ||
      document.hidden ||
      document.querySelector("dialog[open]")
    )
      return;
    release();
    linkSigil.release();
    active = year;
    for (const link of year
      .closest(".year-group")
      .querySelectorAll(".entry:not([hidden]) .entry-link")) {
      if (!owners.has(link)) owners.set(link, createSigil());
      owners.get(link).draw(link);
    }
  }
  const preview = (yearPreview = {
    draw,
    release,
    clear,
    move(target) {
      if (active && !active.contains(target)) release();
    },
    scroll() {
      if (!active?.matches(":hover")) clear();
    },
  });
  for (const year of archive.querySelectorAll(".year")) {
    on(year, "pointerenter", (event) => {
      if (event.pointerType !== "touch") draw(year);
    });
    on(year, "pointerleave", (event) => {
      if (event.relatedTarget && pageFocused && !document.hidden && active === year) release();
    });
  }
  dispose(() => {
    for (const owner of owners.values()) owner.destroy();
    if (yearPreview === preview) yearPreview = null;
  });
});
export const clearSigil = () => {
  linkSigil.clear();
  yearPreview?.clear();
};
export const drawSigil = (link) => {
  if (link.matches(".year")) {
    yearPreview?.draw(link);
    return;
  }
  yearPreview?.release();
  // A visible destination owns the art; otherwise its ToC link can preview it.
  const heading = link.matches("[data-toc] a")
    ? document.getElementById(decodeURIComponent(link.hash.slice(1)))
    : null;
  const bounds = heading?.getBoundingClientRect();
  if (
    link.matches(".prose .header-anchor") ||
    (bounds && bounds.bottom > 0 && bounds.top < innerHeight)
  ) {
    linkSigil.release();
    return;
  }
  linkSigil.draw(link);
};
document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const link = hoverTarget(event.target);
  if (
    !pageFocused ||
    document.hidden ||
    (event.target === document.documentElement &&
      document.documentElement.hasAttribute("data-soft-navigation"))
  )
    return;
  yearPreview?.move(event.target);
  if (link && !hoverRegion(link).contains(event.relatedTarget)) drawSigil(link);
  else if (!link && linkSigil.target && !hoverRegion(linkSigil.target).contains(event.target))
    linkSigil.release();
});
document.addEventListener("pointerout", (event) => {
  if (!event.relatedTarget || !pageFocused || document.hidden) return;
  const link = linkSigil.target;
  const region = hoverRegion(link);
  // View-transition capture briefly hit-tests the root instead of the live nav.
  if (
    link?.closest(".site-header") &&
    document.documentElement.hasAttribute("data-soft-navigation") &&
    event.relatedTarget === document.documentElement
  )
    return;
  if (region?.contains(event.target) && !region.contains(event.relatedTarget)) linkSigil.release();
});
document.addEventListener("focusin", (event) => {
  const link = hoverTarget(event.target);
  if (link) drawSigil(link);
});
document.addEventListener("focusout", (event) => {
  if (!pageFocused || document.hidden) return;
  const region = hoverRegion(linkSigil.target);
  if (region?.contains(event.target) && !region.matches(":hover")) linkSigil.release();
});
document.addEventListener(
  "scroll",
  () => {
    yearPreview?.scroll();
    if (!linkSigil.target?.closest(".site-header")) {
      if (linkSigil.target) clearSigil();
    }
  },
  { passive: true, capture: true },
);
document.addEventListener("site:before-swap", () => {
  if (linkSigil.target && !linkSigil.target.closest(".site-header")) linkSigil.release();
});
function syncActivity() {
  for (const effect of liveEffects) {
    if (pageFocused && !document.hidden) effect.resume();
    else effect.pause();
  }
}
document.addEventListener("visibilitychange", syncActivity);
window.addEventListener("blur", () => {
  pageFocused = false;
  syncActivity();
});
window.addEventListener("focus", () => {
  pageFocused = true;
  syncActivity();
});
window.addEventListener("resize", clearSigil);
window.addEventListener("pagehide", clearSigil);
motion.addEventListener("change", clearSigil);
contrast.addEventListener("change", clearSigil);
