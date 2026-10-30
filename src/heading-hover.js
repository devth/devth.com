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
  const target = preferred();
  const version = ++revision;
  if (!target || motion.matches || document.hidden) {
    renderer?.clear(!motion.matches && !document.hidden);
    return;
  }
  loading ||= import("./link-sigil.js")
    .then(({ createSigil }) => {
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
      !document.hidden
    )
      instance.draw(target);
  });
}
function refresh() {
  for (const heading of headings) {
    heading.classList.toggle(
      "is-destination-active",
      heading === selected ||
        sources.some((source) => source.heading === heading && (source.hovered || source.focused)),
    );
  }
  for (const [link, heading] of tocLinks) {
    link.classList.toggle(
      "is-destination-active",
      heading?.classList.contains("is-destination-active") || false,
    );
  }
  cancelAnimationFrame(queued);
  queued = requestAnimationFrame(updateGlyph);
}
function clearIntents(heading) {
  for (const source of sources) {
    if (!heading || source.heading === heading) source.hovered = source.focused = false;
  }
}
export function activateHeading(heading) {
  clearTimeout(timer);
  if (selected) clearIntents(selected);
  clearIntents(heading);
  selected = heading;
  timer = setTimeout(() => {
    // Return to the original state after five seconds even if the pointer or
    // keyboard focus has stayed put. A fresh enter/focus activates it again.
    clearIntents(heading);
    selected = null;
    timer = 0;
    refresh();
  }, 5000);
  refresh();
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
  element.addEventListener("pointerleave", () => {
    source.hovered = false;
    refresh();
  });
  element.addEventListener("focus", () => {
    source.focused = true;
    source.order = ++intent;
    refresh();
  });
  element.addEventListener("blur", () => {
    source.focused = false;
    refresh();
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
      if (location.hash !== link.hash) history.pushState(history.state, "", link.hash);
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
  clearIntents();
  revision++;
  renderer?.clear();
  for (const heading of headings) heading.classList.remove("is-destination-active");
  for (const link of tocLinks.keys()) link.classList.remove("is-destination-active");
}
window.addEventListener(
  "scroll",
  () => {
    if (!queued && preferred()) queued = requestAnimationFrame(updateGlyph);
  },
  { passive: true },
);
window.addEventListener("blur", clear);
window.addEventListener("pagehide", clear);
window.addEventListener("popstate", clear);
window.addEventListener("resize", () => {
  renderer?.clear();
  if (preferred()) refresh();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clear();
});
motion.addEventListener("change", () => {
  renderer?.clear();
  refresh();
});
