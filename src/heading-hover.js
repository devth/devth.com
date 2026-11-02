import { onPage } from "./page-lifecycle.js";
import { pushFragment } from "./fragment-history.js";
let activateCurrent = () => {};
export function activateHeading(heading) {
  activateCurrent(heading);
}
onPage(".prose :is(h2, h3, h4, h5, h6)", (_, { on, dispose, signal }) => {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const headings = [...document.querySelectorAll(".prose :is(h2, h3, h4, h5, h6)")];
  const tocLinks = new Map(
    [...document.querySelectorAll("[data-toc] a")].map((link) => [
      link,
      document.getElementById(decodeURIComponent(link.hash.slice(1))),
    ]),
  );
  const sources = [];
  let selected;
  let timer = 0;
  let queued = 0;
  let renderer;
  let loading;
  let revision = 0;
  let intent = 0;
  let unwindExit = false;
  let focused = true,
    paused = false,
    holdUntil = 0,
    holdRemaining = 0;

  function preferred() {
    const latest = sources.reduce(
      (current, source) =>
        (source.hovered || source.focused) && (!current || source.order > current.order)
          ? source
          : current,
      null,
    );
    return latest?.heading || selected;
  }
  function updateGlyph() {
    queued = 0;
    if (paused || document.hidden) return;
    const target = preferred();
    const version = ++revision;
    if (!target || motion.matches) {
      if (!target && unwindExit && !motion.matches) renderer?.release();
      else renderer?.clear(!motion.matches);
      return;
    }
    loading ||= import("./link-sigil.js")
      .then(({ createSigil }) => {
        if (signal.aborted) return;
        renderer = createSigil({ className: "heading-sigil", follow: true });
        return renderer;
      })
      .catch(() => {
        loading = null;
      });
    loading.then((instance) => {
      if (
        instance &&
        version === revision &&
        preferred() === target &&
        !motion.matches &&
        !paused &&
        !document.hidden
      )
        instance.draw(target);
    });
  }
  function refresh(unwind = false) {
    unwindExit = unwind;
    for (const heading of headings) {
      heading.classList.toggle(
        "is-destination-active",
        heading === selected ||
          sources.some(
            (source) => source.heading === heading && (source.hovered || source.focused),
          ),
      );
    }
    for (const [link, heading] of tocLinks) {
      link.classList.toggle(
        "is-destination-active",
        heading?.classList.contains("is-destination-active") || false,
      );
    }
    cancelAnimationFrame(queued);
    if (!paused) queued = requestAnimationFrame(updateGlyph);
  }
  function clearIntents(heading) {
    for (const source of sources) {
      if (!heading || source.heading === heading) source.hovered = source.focused = false;
    }
  }
  function activateHeading(heading) {
    clearTimeout(timer);
    if (selected) clearIntents(selected);
    clearIntents(heading);
    selected = heading;
    scheduleHold(5000);
    refresh();
  }
  function scheduleHold(duration) {
    holdRemaining = duration;
    if (paused) return;
    holdUntil = performance.now() + duration;
    timer = setTimeout(() => {
      clearIntents(selected);
      selected = null;
      timer = holdUntil = holdRemaining = 0;
      refresh();
    }, duration);
  }
  function activity() {
    if (!focused || document.hidden) {
      if (paused) return;
      paused = true;
      if (timer) holdRemaining = Math.max(0, holdUntil - performance.now());
      clearTimeout(timer);
      cancelAnimationFrame(queued);
      timer = queued = 0;
    } else if (paused) {
      paused = false;
      if (selected) scheduleHold(holdRemaining);
      if (preferred() && !renderer?.target) refresh();
    }
  }
  function register(element, heading) {
    const source = { element, heading, hovered: false, focused: false, order: 0 };
    sources.push(source);
    element.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") {
        source.hovered = true;
        source.order = ++intent;
        refresh();
      }
    });
    element.addEventListener("pointerleave", (event) => {
      if (!event.relatedTarget || paused || document.hidden) return;
      source.hovered = false;
      refresh(true);
    });
    element.addEventListener("focus", () => {
      source.focused = true;
      source.order = ++intent;
      refresh();
    });
    element.addEventListener("blur", () => {
      if (paused || document.hidden) return;
      source.focused = false;
      refresh(true);
    });
  }
  for (const heading of headings) {
    register(heading, heading);
    const permalink = heading.querySelector(".header-anchor");
    if (permalink) register(permalink, heading);
    heading.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        (link && !link.matches(".header-anchor[href^='#']")) ||
        !getSelection()?.isCollapsed
      )
        return;
      if (link) {
        event.preventDefault();
        if (location.hash !== link.hash && !pushFragment(link.hash)) return;
        heading.scrollIntoView({ behavior: "instant", block: "start" });
      }
      activateHeading(heading);
    });
  }
  for (const [link, heading] of tocLinks) {
    if (heading) register(link, heading);
  }
  function clear() {
    clearTimeout(timer);
    cancelAnimationFrame(queued);
    timer = queued = 0;
    selected = null;
    holdUntil = holdRemaining = 0;
    clearIntents();
    revision++;
    renderer?.clear();
    for (const heading of headings) heading.classList.remove("is-destination-active");
    for (const link of tocLinks.keys()) link.classList.remove("is-destination-active");
  }
  on(
    window,
    "scroll",
    () => {
      if (!paused && !queued && preferred()) queued = requestAnimationFrame(updateGlyph);
    },
    { passive: true },
  );
  on(document, "pointerover", (event) => {
    if (
      paused ||
      document.hidden ||
      event.pointerType === "touch" ||
      document.documentElement.hasAttribute("data-soft-navigation")
    )
      return;
    let changed = false;
    for (const source of sources) {
      if (source.hovered && !source.element.contains(event.target)) {
        source.hovered = false;
        changed = true;
      }
    }
    if (changed) refresh(true);
  });
  on(document, "keydown", (event) => {
    if (event.key === "Escape" && !event.defaultPrevented) clear();
  });
  on(window, "blur", () => {
    focused = false;
    activity();
  });
  on(window, "focus", () => {
    focused = true;
    activity();
  });
  on(window, "pagehide", clear);
  on(window, "popstate", clear);
  on(window, "resize", () => {
    renderer?.clear();
    if (preferred()) refresh();
  });
  on(document, "visibilitychange", activity);
  on(motion, "change", () => {
    renderer?.clear();
    refresh();
  });
  activateCurrent = activateHeading;
  dispose(() => {
    clear();
    renderer?.destroy();
    if (activateCurrent === activateHeading) activateCurrent = () => {};
  });
});
