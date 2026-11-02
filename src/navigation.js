import { mountPage, unmountPage } from "./page-lifecycle.js";
import { pushFragment } from "./fragment-history.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const positions = new Map();
let pending;
let pendingIsTraversal = false;
let transition;
let sequence = 0;
let rendered = new URL(location.href);
let entry = history.state?.devthEntry || crypto.randomUUID();
let restoreCleanup = () => {};
let pageClasses = document.querySelector("main").dataset.pageClass || "";
history.replaceState({ ...history.state, devthEntry: entry }, "");
history.scrollRestoration = "manual";
const announcement = document.createElement("p");
announcement.className = "sr-only";
announcement.dataset.navigationAnnouncement = "";
announcement.setAttribute("aria-live", "polite");
document.body.append(announcement);

document.addEventListener(
  "click",
  (event) => {
    if (!pendingIsTraversal && location.pathname === rendered.pathname)
      rendered = new URL(location.href);
    const link = event.target.closest?.("a[href]");
    if (
      link &&
      !pendingIsTraversal &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      samePage(new URL(link.href), new URL(location.href))
    )
      cancelNavigation();
    savePosition();
    queueMicrotask(() => {
      if (!pendingIsTraversal && location.pathname === rendered.pathname)
        rendered = new URL(location.href);
    });
  },
  { capture: true },
);
document.addEventListener("site:before-fragment", (event) => {
  if (pendingIsTraversal) event.preventDefault();
});
document.addEventListener("site:fragment", () => {
  savePosition();
  entry = history.state.devthEntry;
  rendered = new URL(location.href);
});
window.addEventListener("pagehide", savePosition);
window.addEventListener("pageshow", (event) => {
  if (event.persisted)
    restorePosition(new URL(location.href), positions.get(keyFor(new URL(location.href))), false);
});

function savePosition() {
  positions.set(entry + "|" + rendered.href, {
    x: scrollX,
    y: scrollY,
  });
}
function keyFor(url) {
  return (history.state?.devthEntry || "") + "|" + url.href;
}
function samePage(a, b) {
  return a.pathname === b.pathname && a.search === b.search;
}
function restorePosition(url, saved, keyboard) {
  restoreCleanup();
  if (saved) {
    const retry = () => scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
    const controller = new AbortController();
    const observer = new ResizeObserver(retry);
    const timer = setTimeout(() => restoreCleanup(), 2000);
    restoreCleanup = () => {
      clearTimeout(timer);
      observer.disconnect();
      controller.abort();
      restoreCleanup = () => {};
    };
    for (const type of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.addEventListener(type, () => restoreCleanup(), {
        passive: true,
        once: true,
        signal: controller.signal,
      });
    observer.observe(document.querySelector("main"));
    retry();
  } else {
    let target;
    try {
      target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch {
      /* native fallback for malformed fragments */
    }
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
    else scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  if (keyboard) document.querySelector("main").focus({ preventScroll: true });
}
async function stylesFor(content, base, signal) {
  const incoming = [...content.querySelectorAll('link[rel="stylesheet"]')];
  const urls = incoming.map((link) => new URL(link.getAttribute("href"), base).href);
  await Promise.all(
    incoming.map(async (link, index) => {
      if (
        [...document.querySelectorAll('link[rel="stylesheet"]')].some(
          (old) => old.href === urls[index],
        )
      )
        return;
      const sheet = document.createElement("link");
      sheet.rel = "stylesheet";
      sheet.href = urls[index];
      await new Promise((resolve, reject) => {
        sheet.onload = resolve;
        sheet.onerror = () => reject(new Error("Page stylesheet unavailable"));
        signal.addEventListener(
          "abort",
          () => {
            sheet.remove();
            reject(signal.reason);
          },
          { once: true },
        );
        document.head.append(sheet);
      });
    }),
  );
  return urls;
}
function cancelNavigation() {
  ++sequence;
  pending?.abort();
  pending = null;
  pendingIsTraversal = false;
  transition?.skipTransition();
  restoreCleanup();
  document.querySelector("main")?.removeAttribute("aria-busy");
}
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && pending && !pendingIsTraversal) cancelNavigation();
});
async function navigate(requested, { pop = false, keyboard = false } = {}) {
  cancelNavigation();
  const version = sequence;
  const controller = (pending = new AbortController());
  pendingIsTraversal = pop;
  savePosition();
  const saved = pop ? positions.get(keyFor(requested)) : null;
  document.querySelector("main").setAttribute("aria-busy", "true");
  try {
    const response = await fetch(requested, {
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    if (
      !response.ok ||
      new URL(response.url).origin !== location.origin ||
      !response.headers.get("content-type")?.includes("text/html")
    )
      throw new Error("Native navigation required");
    // Template parsing is inert: counters/images must not load until the page is committed.
    const template = document.createElement("template");
    template.innerHTML = await response.text();
    const content = template.content;
    const main = content.querySelector("main#main[data-page-class]");
    const header = content.querySelector(".site-header");
    const footer = content.querySelector(".site-footer");
    if (
      !main ||
      !header ||
      !footer ||
      !content.querySelector("#quick-nav") ||
      content.querySelector('meta[name="site-build"]')?.content !==
        document.querySelector('meta[name="site-build"]')?.content
    )
      throw new Error("Native navigation required");
    const sheets = await stylesFor(content, response.url, controller.signal);
    if (version !== sequence) return;
    const url = new URL(response.url);
    url.hash = requested.hash;
    const swap = () => {
      if (version !== sequence) return;
      document.dispatchEvent(new Event("site:before-swap"));
      unmountPage();
      document.querySelector("#quick-nav")?.close();
      if (!pop) {
        entry = crypto.randomUUID();
        history.pushState({ devthEntry: entry }, "", url);
      } else {
        entry = history.state?.devthEntry || crypto.randomUUID();
        history.replaceState({ ...history.state, devthEntry: entry }, "");
      }
      rendered = url;
      for (const token of pageClasses.split(/\s+/).filter(Boolean))
        document.body.classList.remove(token);
      pageClasses = main.dataset.pageClass;
      for (const token of pageClasses.split(/\s+/).filter(Boolean))
        document.body.classList.add(token);
      for (const script of content.querySelectorAll("script")) script.remove();
      document.querySelector("main").replaceWith(main);
      const currentFooter = document.querySelector(".site-footer");
      const counter = footer.querySelector(".hit-counter");
      const image = counter.querySelector("img");
      const counterURL = new URL(image.src);
      counterURL.searchParams.set("visit", crypto.randomUUID());
      image.src = counterURL.href;
      currentFooter.querySelector(".hit-counter").replaceWith(counter);
      currentFooter.querySelector(":scope > p").replaceWith(footer.querySelector(":scope > p"));
      document
        .querySelector(".brand")
        .replaceChildren(...header.querySelector(".brand").childNodes);
      for (const link of document.querySelectorAll(".site-header nav a")) {
        const current = [...header.querySelectorAll("nav a")].find(
          (next) => next.getAttribute("href") === link.getAttribute("href"),
        );
        if (current?.hasAttribute("aria-current"))
          link.setAttribute("aria-current", current.getAttribute("aria-current"));
        else link.removeAttribute("aria-current");
      }
      document.title = content.querySelector("title").textContent;
      const metadata =
        'meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[property^="article:"],link[rel="canonical"]';
      for (const old of document.head.querySelectorAll(metadata)) old.remove();
      for (const next of content.querySelectorAll(metadata)) document.head.append(next);
      for (const old of document.head.querySelectorAll('link[rel="stylesheet"]'))
        if (!sheets.includes(old.href)) old.remove();
      mountPage();
      restorePosition(url, saved, keyboard);
      announcement.textContent = document.title;
      document.documentElement.dataset.navigationReady = url.pathname + url.search;
    };
    if (document.startViewTransition && !motion.matches) {
      document.documentElement.dataset.softNavigation = "";
      transition = document.startViewTransition(swap);
      document.dispatchEvent(
        new CustomEvent("site:navigation", { detail: { viewTransition: transition } }),
      );
      const current = transition;
      // A skipped capture rejects ready independently of the finished promise.
      current.ready.catch(() => {});
      const finish = () => {
        if (transition === current) {
          transition = null;
          delete document.documentElement.dataset.softNavigation;
        }
      };
      current.finished.then(finish, finish);
      await current.updateCallbackDone;
    } else {
      swap();
      document.dispatchEvent(
        new CustomEvent("site:navigation", { detail: { viewTransition: null } }),
      );
    }
  } catch {
    if (version === sequence && !controller.signal.aborted) {
      if (pop) location.replace(requested.href);
      else location.assign(requested.href);
    }
  } finally {
    if (version === sequence) {
      pending = null;
      pendingIsTraversal = false;
      document.querySelector("main")?.removeAttribute("aria-busy");
    }
  }
}
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  )
    return;
  const url = new URL(link.href);
  if (
    url.origin !== location.origin ||
    !["http:", "https:"].includes(url.protocol) ||
    /\.(?:xml|pdf|png|jpe?g|svg|webp|gif|zip)$/i.test(url.pathname)
  )
    return;
  if (samePage(url, new URL(location.href))) {
    if (pending && pendingIsTraversal) {
      event.preventDefault();
      return;
    }
    if (link.closest(".site-header") && !url.hash) {
      event.preventDefault();
      if (location.hash && !pushFragment(url)) return;
      scrollTo({ top: 0, behavior: motion.matches ? "instant" : "smooth" });
    }
    return;
  }
  event.preventDefault();
  navigate(url, { keyboard: event.detail === 0 });
});
window.addEventListener("hashchange", () => {
  const url = new URL(location.href);
  if (!samePage(url, rendered)) return;
  entry = history.state?.devthEntry || crypto.randomUUID();
  history.replaceState({ ...history.state, devthEntry: entry }, "");
  rendered = url;
});
window.addEventListener("popstate", () => {
  const url = new URL(location.href);
  if (samePage(url, rendered)) {
    cancelNavigation();
    savePosition();
    const saved = positions.get(keyFor(url));
    entry = history.state?.devthEntry || crypto.randomUUID();
    history.replaceState({ ...history.state, devthEntry: entry }, "");
    rendered = url;
    restorePosition(url, saved, false);
    return;
  }
  navigate(url, { pop: true });
});
