import "./background.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
let sigils;
function clearSigil() {
  sigils?.clearSigil();
}
function loadSigils(event) {
  const link = event.target.closest("a");
  if (
    !link ||
    motion.matches ||
    event.pointerType === "touch" ||
    link.closest("dialog") ||
    link.classList.contains("skip-link")
  )
    return;
  document.removeEventListener("pointerover", loadSigils);
  document.removeEventListener("focusin", loadSigils);
  import("./link-sigil.js")
    .then((module) => {
      sigils = module;
      if (link.matches(":hover") || document.activeElement === link) module.drawSigil(link);
    })
    .catch(() => {});
}
document.addEventListener("pointerover", loadSigils);
document.addEventListener("focusin", loadSigils);
const sheen = document.createElement("div");
sheen.className = "page-sheen";
sheen.setAttribute("aria-hidden", "true");
document.body.append(sheen);
window.addEventListener("pagereveal", (event) => {
  delete sheen.dataset.active;
  event.viewTransition?.finished
    .then(() => {
      if (!motion.matches && !document.hidden) sheen.dataset.active = "";
    })
    .catch(() => {});
});
window.addEventListener("pageswap", () => {
  delete sheen.dataset.active;
});
motion.addEventListener("change", () => {
  delete sheen.dataset.active;
});

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
    status.classList.toggle("sr-only", !category && !search.value.trim());
  }
  document.querySelector("[data-clear-filter]").addEventListener("click", () => {
    search.value = "";
    filter();
    search.focus();
  });
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
