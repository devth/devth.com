import { rotate } from "./graph-geometry.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const namespace = "http://www.w3.org/2000/svg";

// A heading arrival and an ordinary link hover share geometry, not ownership.
// Clearing one must not interrupt the other.
export function createSigil({ className = "link-sigil", follow = false } = {}) {
  const sigil = document.createElementNS(namespace, "svg");
  sigil.classList.add(className);
  sigil.setAttribute("viewBox", "0 0 80 80");
  sigil.setAttribute("aria-hidden", "true");
  sigil.setAttribute("focusable", "false");
  sigil.setAttribute("hidden", "");
  document.body.append(sigil);
  let activeLink;
  let frame = 0;
  let hideTimer = 0;
  let range;

  function clear(fade = false) {
    if (fade && !activeLink) return;
    cancelAnimationFrame(frame);
    clearTimeout(hideTimer);
    frame = hideTimer = 0;
    activeLink?.classList.remove("link-distortion");
    activeLink = range = null;
    sigil.classList.remove("is-visible");
    if (fade && !motion.matches)
      hideTimer = setTimeout(() => sigil.setAttribute("hidden", ""), 180);
    else sigil.setAttribute("hidden", "");
  }
  function position(link) {
    const rect = (range || link.querySelector(".entry-title") || link).getBoundingClientRect();
    if (follow && (!link.isConnected || rect.bottom <= 0 || rect.top >= innerHeight)) return false;
    sigil.style.left =
      Math.min(innerWidth - 72, Math.max(0, follow ? rect.right + 6 : rect.right - 42)) + "px";
    sigil.style.top =
      Math.min(innerHeight - 72, Math.max(0, rect.top + rect.height / 2 - 36)) + "px";
    return true;
  }
  function draw(link) {
    if (follow && activeLink === link) return;
    clear();
    if (
      motion.matches ||
      document.hidden ||
      link.classList.contains("skip-link") ||
      link.closest("dialog")
    )
      return;
    if (follow) {
      range = document.createRange();
      range.selectNodeContents(link);
    }
    if (!position(link)) {
      range = null;
      return;
    }
    activeLink = link;
    link.classList.add("link-distortion");
    const vertices = [
      [-20, -12, 0],
      [20, -12, 0],
      [0, 22, 0],
      [0, 0, 24],
      [0, 0, -24],
    ].map((point) => ({
      coordinates: point.map((value) => value + (Math.random() - 0.5) * 6),
      phase: Math.random() * Math.PI * 2,
    }));
    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 0],
      [3, 1],
      [3, 2],
      [4, 0],
      [4, 1],
      [4, 2],
    ];
    const path = document.createElementNS(namespace, "path");
    const circles = vertices.map(() => document.createElementNS(namespace, "circle"));
    sigil.replaceChildren(path, ...circles);
    sigil.removeAttribute("hidden");
    if (follow) sigil.getBoundingClientRect();
    sigil.classList.add("is-visible");
    let pitch = Math.random() * Math.PI * 2;
    let yaw = Math.random() * Math.PI * 2;
    let speed = [0.3, 0.5];
    let target = speed;
    let last = performance.now();
    let nextShift = last;
    function animate(now) {
      if (!activeLink || motion.matches || document.hidden || (follow && !position(activeLink))) {
        clear();
        return;
      }
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now >= nextShift) {
        target = [Math.random() - 0.5, Math.random() - 0.5].map((value) => value * 1.4);
        nextShift = now + 650 + Math.random() * 800;
      }
      speed = speed.map((value, axis) => value + (target[axis] - value) * delta * 2);
      pitch += speed[0] * delta;
      yaw += speed[1] * delta;
      const points = vertices.map(({ coordinates, phase }, index) => {
        const [x, y, z] = coordinates.map(
          (value, axis) => value + Math.sin(now * (0.0007 + axis * 0.0002) + phase) * 2,
        );
        const rotated = rotate({ x, y, z }, pitch, yaw);
        const scale = 120 / (120 - rotated.z);
        const point = { x: 40 + rotated.x * scale, y: 40 + rotated.y * scale };
        circles[index].setAttribute("cx", point.x.toFixed(2));
        circles[index].setAttribute("cy", point.y.toFixed(2));
        circles[index].setAttribute("r", (1.5 * scale).toFixed(2));
        circles[index].setAttribute("opacity", (0.65 + rotated.z / 100).toFixed(2));
        return point;
      });
      path.setAttribute(
        "d",
        edges
          .map(
            ([a, b]) =>
              `M${points[a].x.toFixed(2)} ${points[a].y.toFixed(2)}L${points[b].x.toFixed(2)} ${points[b].y.toFixed(2)}`,
          )
          .join(" "),
      );
      frame = requestAnimationFrame(animate);
    }
    animate(last);
  }
  return {
    draw,
    clear,
    get target() {
      return activeLink;
    },
  };
}

const linkSigil = createSigil();
export const clearSigil = () => linkSigil.clear();
export const drawSigil = (link) => linkSigil.draw(link);
document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const link = event.target.closest("a");
  if (link && !link.contains(event.relatedTarget)) drawSigil(link);
});
document.addEventListener("pointerout", (event) => {
  const link = linkSigil.target;
  if (link?.contains(event.target) && !link.contains(event.relatedTarget)) clearSigil();
});
document.addEventListener("focusin", (event) => {
  const link = event.target.closest("a");
  if (link) drawSigil(link);
});
document.addEventListener("focusout", clearSigil);
document.addEventListener("scroll", clearSigil, { passive: true, capture: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearSigil();
});
window.addEventListener("blur", clearSigil);
window.addEventListener("resize", clearSigil);
window.addEventListener("pagehide", clearSigil);
motion.addEventListener("change", clearSigil);
