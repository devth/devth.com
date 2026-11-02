import "./background.js";
import { hoverTarget } from "./hover-target.js";
import { pushFragment } from "./fragment-history.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
import { onPage } from "./page-lifecycle.js";
const footerTop = document.querySelector('.site-footer a[href="#top"]');
footerTop?.addEventListener("click", (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  if (location.hash !== footerTop.hash && !pushFragment(footerTop.hash)) return;
  document.querySelector(".site-header nav a")?.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: motion.matches ? "instant" : "smooth" });
});
let sigils;
let loadingSigils;
let pendingSigil;
function clearSigil() {
  pendingSigil = null;
  sigils?.clearSigil();
}
window.addEventListener("blur", () => {
  pendingSigil = null;
});
function loadSigils(event) {
  const link = hoverTarget(event.target) || event.target.closest?.(".year");
  if (
    !link ||
    motion.matches ||
    event.pointerType === "touch" ||
    link.closest("dialog") ||
    link.classList.contains("skip-link")
  )
    return;
  pendingSigil = link;
  if (loadingSigils) return;
  loadingSigils = import("./link-sigil.js")
    .then((module) => {
      sigils = module;
      for (const type of ["pointerover", "focusin"]) document.removeEventListener(type, loadSigils);
      const current = pendingSigil;
      pendingSigil = null;
      if (
        current &&
        (current.closest(".entry")?.matches(":hover") ||
          current.matches(":hover") ||
          document.activeElement === current)
      )
        module.drawSigil(current);
    })
    .catch(() => {
      loadingSigils = null;
    });
}
for (const type of ["pointerover", "focusin"]) document.addEventListener(type, loadSigils);

const quickNav = document.querySelector("#quick-nav");
if (quickNav?.showModal) {
  const query = quickNav.querySelector('input[type="search"]');
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
    } else if (event.key === "Escape") clearSigil();
  });
}

import("./collapse-trigger.js").then(
  (module) => module.init(clearSigil),
  () => {},
);

onPage("main", () => {
  if (document.querySelector("[data-toc]")) import("./toc.js");
  else if (document.querySelector(".prose :is(h2, h3, h4, h5, h6)")) import("./heading-hover.js");
  if (document.querySelector("[data-hover-board]")) import("./hover-lab.js");
  if (document.querySelector("[data-cosmos-stage]")) import("./cosmos.js");
});

onPage("section.writing", (_, { on }) => {
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
    entries.forEach((entry, index) => {
      const inCategory =
        !category ||
        categories[index].some((name) => name.toLowerCase() === category.toLowerCase());
      entry.hidden = !inCategory;
    });
    for (const group of groups) group.hidden = !group.querySelector(".entry:not([hidden])");
    const count = entries.filter((entry) => !entry.hidden).length;
    document.querySelector("[data-no-results]").hidden = count !== 0;
    status.textContent = count + (count === 1 ? " post found." : " posts found.");
    status.classList.toggle("sr-only", !category);
  }
  filter();
  on(window, "pageshow", filter);
});
import("./cursor.js").then(
  (module) => module.init(),
  () => {},
);
import("./navigation.js").catch(() => {
  /* Native anchors remain the fallback. */
});
