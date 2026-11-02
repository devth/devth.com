import { cursorPath } from "./cursor-geometry.js";

export function init() {
  const root = document.documentElement;
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const contrast = matchMedia("(forced-colors: active)");
  const allowed = () => fine.matches && !reduced.matches && !contrast.matches;
  const native =
    "input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox],[role=combobox],canvas,iframe,object,embed,[draggable=true],[disabled],[aria-disabled=true]";
  let cursor,
    paths,
    active = false,
    frame = 0,
    phase = 0,
    x = 0,
    y = 0;
  function create() {
    if (cursor) return;
    const namespace = "http://www.w3.org/2000/svg";
    cursor = document.createElementNS(namespace, "svg");
    cursor.classList.add("geometric-cursor");
    cursor.setAttribute("viewBox", "0 0 28 28");
    cursor.setAttribute("aria-hidden", "true");
    cursor.setAttribute("focusable", "false");
    cursor.setAttribute("hidden", "");
    paths = ["cursor-outline", "cursor-wire"].map((name) => {
      const path = document.createElementNS(namespace, "path");
      path.classList.add(name);
      cursor.append(path);
      return path;
    });
    const dot = document.createElementNS(namespace, "circle");
    dot.setAttribute("cx", "14");
    dot.setAttribute("cy", "14");
    dot.setAttribute("r", "1.2");
    cursor.append(dot);
    document.body.append(cursor);
  }
  function hide() {
    cancelAnimationFrame(frame);
    frame = 0;
    active = false;
    root.removeAttribute("data-geometric-cursor");
    cursor?.setAttribute("hidden", "");
  }
  function paint() {
    frame = 0;
    if (!active) return;
    const drawing = cursorPath(phase);
    for (const path of paths) path.setAttribute("d", drawing);
  }
  function move(event) {
    const target = event.target;
    if (
      !allowed() ||
      document.hidden ||
      event.pointerType !== "mouse" ||
      event.buttons ||
      !(target instanceof Element) ||
      target === root ||
      target.closest(native) ||
      document.querySelector("dialog[open]")
    ) {
      hide();
      return;
    }
    create();
    if (active) phase = (phase + Math.hypot(event.clientX - x, event.clientY - y) / 180) % 4;
    x = event.clientX;
    y = event.clientY;
    cursor.style.transform = `translate3d(${x - 14}px,${y - 14}px,0)`;
    cursor.classList.toggle("is-action", !!target.closest("a,button,summary,[role=button],.entry"));
    if (!active) {
      active = true;
      paint();
      cursor.removeAttribute("hidden");
      root.setAttribute("data-geometric-cursor", "");
    } else if (!frame) frame = requestAnimationFrame(paint);
  }
  function sync() {
    if (allowed()) create();
    else hide();
  }
  for (const media of [fine, reduced, contrast]) media.addEventListener("change", sync);
  for (const type of ["pointermove", "pointerover"])
    document.addEventListener(type, move, { passive: true });
  document.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) hide();
  });
  for (const type of [
    "pointerdown",
    "pointercancel",
    "dragstart",
    "keydown",
    "site:before-swap",
    "visibilitychange",
  ])
    document.addEventListener(type, hide);
  document.addEventListener("scroll", hide, { passive: true, capture: true });
  for (const type of ["blur", "pagehide", "resize"]) window.addEventListener(type, hide);
  sync();
}
