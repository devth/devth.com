import { preserveCase } from "./lettercase.js";
import { getHoverPreferences, setHoverPreferences } from "./hover-preferences.js";

let initialized = false;

export function initializeSearch(dialog) {
  if (initialized) return;
  initialized = true;
  const query = dialog.querySelector('input[type="search"]');
  const results = dialog.querySelector("[role=listbox]");
  const status = dialog.querySelector("[role=status]");
  const fallback = dialog.querySelector(".quick-nav-fallback");
  const clear = dialog.querySelector("[data-clear-search]");
  const settings = dialog.querySelector("[data-hover-settings]");
  const structure = settings.querySelector("select");
  const generation = settings.querySelector("input");
  function updateSettings() {
    const preferences = getHoverPreferences();
    structure.value = preferences.structure;
    generation.checked = preferences.generation;
  }
  structure.addEventListener("change", () => setHoverPreferences({ structure: structure.value }));
  generation.addEventListener("change", () =>
    setHoverPreferences({ generation: generation.checked }),
  );
  window.addEventListener("hover-preferenceschange", updateSettings);
  updateSettings();
  settings.hidden = false;
  let pages = [];
  let loaded = false;
  let failed = false;
  let active = 0;

  function select(index) {
    const options = [...results.querySelectorAll("[role=option]")];
    if (!options.length) {
      query.removeAttribute("aria-activedescendant");
      return;
    }
    active = (index + options.length) % options.length;
    options.forEach((option, i) => option.setAttribute("aria-selected", String(i === active)));
    query.setAttribute("aria-activedescendant", options[active].id);
    options[active].scrollIntoView({ block: "nearest" });
  }

  function render() {
    if (!loaded) {
      status.textContent = failed ? "Search unavailable." : "Loading…";
      return;
    }
    const words = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = pages
      .filter((page) => words.every((word) => page.search.includes(word)))
      .sort(
        (a, b) =>
          Number(words.every((word) => b.title.toLowerCase().includes(word))) -
          Number(words.every((word) => a.title.toLowerCase().includes(word))),
      );
    results.replaceChildren(
      ...matches.map((page, index) => {
        const item = document.createElement("li");
        item.setAttribute("role", "presentation");
        const link = document.createElement("a");
        link.href = page.path;
        link.id = "quick-nav-option-" + index;
        link.tabIndex = -1;
        link.setAttribute("role", "option");
        const title = document.createElement("span");
        title.textContent = page.title;
        link.append(title);
        if (page.excerpt && page.excerpt.trim().toLowerCase() !== page.title.trim().toLowerCase()) {
          const excerpt = document.createElement("small");
          excerpt.textContent = page.excerpt;
          link.append(excerpt);
        }
        item.append(link);
        return item;
      }),
    );
    preserveCase(results);
    clear.hidden = matches.length !== 0 || !query.value.trim();
    status.textContent = matches.length
      ? matches.length + (matches.length === 1 ? " page." : " pages.")
      : "No matching pages.";
    select(0);
  }

  clear.addEventListener("click", () => {
    query.value = "";
    render();
    query.focus();
  });
  query.addEventListener("input", render);
  query.addEventListener("keydown", (event) => {
    if (event.isComposing || event.metaKey || event.altKey) return;
    const controlKey = event.ctrlKey && !event.shiftKey ? event.key.toLowerCase() : "";
    if (event.ctrlKey && !["n", "p"].includes(controlKey)) return;
    const next = event.key === "ArrowDown" || controlKey === "n";
    const previous = event.key === "ArrowUp" || controlKey === "p";
    if (next || previous) {
      event.preventDefault();
      select(active + (next ? 1 : -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results.querySelector('[aria-selected="true"]')?.click();
    }
  });
  fetch("/search.json")
    .then((response) => {
      if (!response.ok) throw new Error("Search unavailable");
      return response.json();
    })
    .then((index) => {
      pages = index.map((page) => ({
        ...page,
        search: [page.title, page.excerpt, page.path, ...(page.categories || [])]
          .join(" ")
          .toLowerCase(),
      }));
      loaded = true;
      render();
    })
    .catch(() => {
      failed = true;
      fallback.hidden = false;
      render();
    });
}
