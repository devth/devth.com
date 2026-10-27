import "./background.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const namespace = "http://www.w3.org/2000/svg";
const sigil = document.createElementNS(namespace, "svg");
sigil.classList.add("link-sigil");
sigil.setAttribute("viewBox", "0 0 80 80");
sigil.setAttribute("aria-hidden", "true");
sigil.setAttribute("focusable", "false");
sigil.setAttribute("hidden", "");
document.body.append(sigil);
let activeLink;

function clearSigil() {
  activeLink?.classList.remove("link-distortion");
  activeLink = null;
  sigil.setAttribute("hidden", "");
}
function drawSigil(link) {
  clearSigil();
  if (motion.matches || link.classList.contains("skip-link")) return;
  activeLink = link;
  link.classList.add("link-distortion");
  const rect = (link.querySelector(".entry-arrow") || link).getBoundingClientRect();
  sigil.style.left = Math.min(innerWidth - 72, Math.max(0, rect.right - 42)) + "px";
  sigil.style.top = Math.min(innerHeight - 72, Math.max(0, rect.top + rect.height / 2 - 36)) + "px";
  const points = Array.from({ length: 5 }, () => [
    12 + Math.random() * 56,
    12 + Math.random() * 56,
  ]);
  sigil.replaceChildren();
  const path = document.createElementNS(namespace, "path");
  path.setAttribute(
    "d",
    points.map(([x, y], i) => (i ? "L" : "M") + x + " " + y).join(" ") +
      "Z M" +
      points[0].join(" ") +
      "L" +
      points[2].join(" "),
  );
  sigil.append(path);
  for (const [cx, cy] of points) {
    const node = document.createElementNS(namespace, "circle");
    node.setAttribute("cx", cx);
    node.setAttribute("cy", cy);
    node.setAttribute("r", "1.8");
    sigil.append(node);
  }
  // Restart one short geometric flourish, never a repeating glitch or flashing text.
  sigil.removeAttribute("hidden");
  sigil.getAnimations().forEach((animation) => animation.cancel());
  sigil.animate(
    [
      { opacity: 0, transform: "scale(.45) rotate(-24deg)" },
      { opacity: 0.85, offset: 0.3 },
      { opacity: 0.45, transform: "scale(1) rotate(12deg)" },
    ],
    { duration: 520, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
  );
}
document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const link = event.target.closest("a");
  if (link && !link.contains(event.relatedTarget)) drawSigil(link);
});
document.addEventListener("pointerout", (event) => {
  if (activeLink && !activeLink.contains(event.relatedTarget)) clearSigil();
});
document.addEventListener("focusin", (event) => {
  const link = event.target.closest("a");
  if (link) drawSigil(link);
});
document.addEventListener("focusout", clearSigil);
document.addEventListener("scroll", clearSigil, { passive: true, capture: true });
motion.addEventListener("change", clearSigil);

const quickNav = document.querySelector("#quick-nav");
if (quickNav?.showModal) {
  const query = quickNav.querySelector("input");
  function toggleQuickNav() {
    clearSigil();
    if (quickNav.open) {
      quickNav.close();
      return;
    }
    query.value = "";
    quickNav.showModal();
    import("./search.js")
      .then(({ initializeSearch }) => {
        initializeSearch(quickNav);
        query.dispatchEvent(new Event("input"));
      })
      .catch(() => {
        quickNav.querySelector("[role=status]").textContent = "Search unavailable.";
        quickNav.querySelector(".quick-nav-fallback").hidden = false;
      });
  }
  const trigger = document.querySelector("[data-quick-nav-trigger]");
  trigger.hidden = false;
  trigger.addEventListener("click", toggleQuickNav);
  quickNav
    .querySelector("[data-quick-nav-close]")
    .addEventListener("click", () => quickNav.close());
  quickNav.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      quickNav.close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      toggleQuickNav();
    }
  });
}

if (document.querySelector("[data-toc]")) import("./toc.js");

const timeline = document.querySelector("[data-x-timeline]");
if (timeline) {
  const button = timeline.querySelector("[data-load-timeline]");
  const status = timeline.querySelector("[data-timeline-status]");
  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Loading timeline…";
    try {
      const { loadTimeline } = await import("./x-timeline.js");
      await loadTimeline(timeline);
      status.textContent = "Timeline loaded.";
      button.textContent = "Timeline loaded";
    } catch {
      status.textContent = "Timeline unavailable. You can view @devth on X.";
      button.disabled = false;
    }
  });
}

const search = document.querySelector("#search");
if (search) {
  document.querySelector("[data-search]").hidden = false;
  const entries = [...document.querySelectorAll(".entry")];
  const groups = [...document.querySelectorAll(".year-group")];
  const status = document.querySelector("[data-search-status]");
  const category = new URLSearchParams(location.search).get("category");
  const categories = entries.map((entry) => JSON.parse(entry.dataset.categories));
  if (category) {
    document.querySelector("[data-category-filter]").hidden = false;
    document.querySelector("[data-category-label]").textContent = category;
  }
  function filter() {
    const words = search.value.toLowerCase().trim().split(/\s+/);
    entries.forEach((entry, index) => {
      const inCategory =
        !category ||
        categories[index].some((name) => name.toLowerCase() === category.toLowerCase());
      entry.hidden = !inCategory || !words.every((word) => entry.dataset.searchText.includes(word));
    });
    for (const group of groups) group.hidden = !group.querySelector(".entry:not([hidden])");
    const count = entries.filter((entry) => !entry.hidden).length;
    document.querySelector("[data-no-results]").hidden = count !== 0;
    status.textContent = count + (count === 1 ? " post found." : " posts found.");
  }
  filter();
  search.addEventListener("input", filter);
  window.addEventListener("pageshow", filter);
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) &&
      !event.target.isContentEditable
    ) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      filter();
      search.blur();
    }
  });
}
