let active;

export async function collapse(trigger, { signal } = {}) {
  if (active || signal?.aborted || document.hidden) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const engine = motion.matches ? null : await import("./demolition-scene.js");
  if (signal?.aborted || document.hidden || !trigger.isConnected) return;
  if (!motion.matches) await new Promise(requestAnimationFrame);
  if (active || signal?.aborted || !trigger.isConnected || document.hidden) return;
  const menu = document.querySelector("#quick-nav");
  const reopen = !!menu?.open;
  const scroll = { x: scrollX, y: scrollY };
  const anchor = [...document.querySelectorAll("main :is(h1,h2,h3,p,.entry),.site-footer")].find(
    (element) => {
      const rect = element.getBoundingClientRect();
      return rect.top <= innerHeight * 0.6 && rect.bottom > 0;
    },
  );
  const anchorTop = anchor?.getBoundingClientRect().top;
  const previousOverflow = document.documentElement.style.overflow;
  const previousFlag = document.body.getAttribute("data-demolishing");
  const scope = new AbortController();
  const dialog = document.createElement("dialog");
  dialog.className = "demolition-dialog";
  dialog.setAttribute("aria-label", "page collapse");
  dialog.setAttribute("aria-describedby", "demolition-instructions");
  dialog.innerHTML =
    '<p id="demolition-instructions" class="sr-only">press Escape or restore to bring the page back.</p><div class="demolition-stage" aria-hidden="true"></div><p class="demolition-message" role="status" hidden></p><button class="text-action demolition-restore" type="button" aria-keyshortcuts="Escape" autofocus>restore</button>';
  const button = dialog.querySelector("button");
  const stage = dialog.querySelector(".demolition-stage");
  let scene;
  let capture;
  let restored = false;
  const restore = ({ focus = true, menu: restoreMenu = true } = {}) => {
    if (restored) return;
    restored = true;
    scope.abort();
    scene?.dispose();
    capture?.dispose();
    if (previousFlag === null) document.body.removeAttribute("data-demolishing");
    else document.body.setAttribute("data-demolishing", previousFlag);
    document.documentElement.style.overflow = previousOverflow;
    dialog.close();
    dialog.remove();
    active = null;
    if (reopen && restoreMenu && menu?.isConnected) menu.showModal();
    const top = anchor?.isConnected
      ? scrollY + anchor.getBoundingClientRect().top - anchorTop
      : scroll.y;
    scrollTo({ left: scroll.x, top, behavior: "instant" });
    if (focus) {
      const target =
        trigger.isConnected && (!reopen || restoreMenu)
          ? trigger
          : document.querySelector("[data-quick-nav-trigger]");
      target?.focus({ preventScroll: true });
    }
  };
  const done = () => {
    if (restored || dialog.classList.contains("is-done")) return;
    scene = undefined;
    capture = undefined;
    stage.replaceChildren();
    dialog.classList.add("is-done");
    const message = dialog.querySelector(".demolition-message");
    message.textContent = "i told you";
    message.hidden = false;
  };
  active = { restore };
  try {
    capture = engine && !motion.matches ? engine.capturePage() : null;
    if (menu?.open) menu.close();
    document.body.append(dialog);
    dialog.showModal();
    document.body.setAttribute("data-demolishing", "");
    document.documentElement.style.overflow = "hidden";
    button.focus({ preventScroll: true });
    button.addEventListener("click", () => restore(), { signal: scope.signal });
    dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        restore();
      },
      { signal: scope.signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          restore();
        } else if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          button.focus({ preventScroll: true });
        } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, signal: scope.signal },
    );
    const leave = () => restore({ focus: false, menu: false });
    window.addEventListener("popstate", leave, { capture: true, signal: scope.signal });
    window.addEventListener("pagehide", leave, { signal: scope.signal });
    document.addEventListener("site:before-swap", leave, { signal: scope.signal });
    motion.addEventListener(
      "change",
      () => {
        if (motion.matches) {
          if (scene) scene.finish();
          else done();
        }
      },
      { signal: scope.signal },
    );
    signal?.addEventListener("abort", leave, { once: true, signal: scope.signal });
    if (capture) scene = engine.createScene(capture, stage, done);
    else done();
  } catch (error) {
    restore();
    throw error;
  }
}
