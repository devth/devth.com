const container = document.querySelector("[data-toc]");
const nav = container.querySelector("nav");
const links = [...nav.querySelectorAll("a")];
const headings = links.map((link) =>
  document.getElementById(decodeURIComponent(link.hash.slice(1))),
);
const article = document.querySelector("article");
const svg = nav.querySelector("svg");
const track = nav.querySelector(".toc-track");
const progress = nav.querySelector(".toc-progress");
const arrival = nav.querySelector(".toc-arrival");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let scrollFrame = 0;
function cancelScroll() {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
}
links.forEach((link, index) =>
  link.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    cancelScroll();
    const heading = headings[index];
    if (location.hash !== link.hash) history.pushState(history.state, "", link.hash);
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const start = scrollY;
    const destination = Math.max(
      0,
      Math.min(
        document.documentElement.scrollHeight - innerHeight,
        heading.getBoundingClientRect().top + start - padding,
      ),
    );
    const focusHeading = () => {
      if (!heading.hasAttribute("tabindex")) {
        heading.tabIndex = -1;
        heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
      }
      heading.focus({ preventScroll: true });
    };
    if (motion.matches) {
      scrollTo({ top: destination, behavior: "instant" });
      focusHeading();
      return;
    }
    const began = performance.now();
    function step(now) {
      const fraction = Math.min(1, (now - began) / 220);
      scrollTo({
        top: start + (destination - start) * (1 - Math.pow(1 - fraction, 3)),
        behavior: "instant",
      });
      if (fraction < 1) scrollFrame = requestAnimationFrame(step);
      else {
        scrollFrame = 0;
        focusHeading();
      }
    }
    scrollFrame = requestAnimationFrame(step);
  }),
);
for (const type of ["wheel", "touchstart", "pointerdown", "keydown"])
  window.addEventListener(type, cancelScroll, { passive: true });
window.addEventListener("pagehide", cancelScroll);
motion.addEventListener("change", cancelScroll);
let distances = [];
let ends = [];
let length = 1;
let queued = false;

function measure() {
  container.toggleAttribute(
    "data-sticky",
    innerWidth > 700 && nav.getBoundingClientRect().height <= innerHeight - 56,
  );
  const bounds = nav.getBoundingClientRect();
  const points = links.map((link) => {
    const rect = link.getBoundingClientRect();
    return {
      x: 4 + Number(link.dataset.depth) * 8,
      halfHeight: rect.height / 2,
      y: rect.top - bounds.top + rect.height / 2,
    };
  });
  let path = "M" + points[0].x + " " + (points[0].y - points[0].halfHeight + 1);
  let distance = points[0].halfHeight - 1;
  distances = [distance];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const next = points[i];
    const bend = previous.x === next.x ? 0 : Math.min(8, (next.y - previous.y) / 2);
    path += " L" + previous.x + " " + (next.y - bend) + " L" + next.x + " " + next.y;
    distance += next.y - bend - previous.y + Math.hypot(next.x - previous.x, bend);
    distances.push(distance);
  }
  const tail = points.at(-1).halfHeight - 1;
  path += " L" + points.at(-1).x + " " + (points.at(-1).y + tail);
  length = distance + tail;
  ends = distances.map((distance, index) => distance + points[index].halfHeight - 1);
  track.setAttribute("d", path);
  progress.setAttribute("d", path);
  arrival.setAttribute("d", path);
  svg.setAttribute("height", String(nav.querySelector("ol").scrollHeight));
  container.dataset.enhanced = "";
  update();
}

function update() {
  const marker = window.innerHeight * 0.25;
  const tops = headings.map((heading) => heading.getBoundingClientRect().top);
  let active = 0;
  for (let i = 0; i < tops.length; i++) if (tops[i] <= marker) active = i;
  const bottom = article.getBoundingClientRect().bottom;
  const end = tops[active + 1] ?? bottom;
  const section = Math.max(
    0,
    Math.min(1, (marker - tops[active]) / Math.max(1, end - tops[active])),
  );
  let fraction =
    Math.max(
      ends[active],
      distances[active] + section * ((distances[active + 1] ?? length) - distances[active]),
    ) / length;
  if (bottom <= innerHeight + 2) {
    active = links.length - 1;
    fraction = 1;
  }
  links.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  progress.style.strokeDashoffset = String(1 - fraction);
  queued = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  },
  { passive: true },
);
window.addEventListener("resize", measure);
const resize = new ResizeObserver(measure);
resize.observe(nav);
resize.observe(article);
measure();
