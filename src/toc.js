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
let distances = [];
let length = 1;
let queued = false;

function measure() {
  const bounds = nav.getBoundingClientRect();
  const points = links.map((link) => {
    const rect = link.getBoundingClientRect();
    return {
      x: 4 + Number(link.dataset.depth) * 8,
      y: rect.top - bounds.top + nav.scrollTop + rect.height / 2,
    };
  });
  let path = "M" + points[0].x + " " + points[0].y;
  let distance = 0;
  distances = [0];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const next = points[i];
    const bend = previous.x === next.x ? 0 : Math.min(8, (next.y - previous.y) / 2);
    path += " L" + previous.x + " " + (next.y - bend) + " L" + next.x + " " + next.y;
    distance += next.y - bend - previous.y + Math.hypot(next.x - previous.x, bend);
    distances.push(distance);
  }
  path += " L" + points.at(-1).x + " " + (points.at(-1).y + 10);
  length = distance + 10;
  track.setAttribute("d", path);
  progress.setAttribute("d", path);
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
    (distances[active] + section * ((distances[active + 1] ?? length) - distances[active])) /
    length;
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
container.addEventListener("toggle", () => {
  if (container.open) measure();
});
const resize = new ResizeObserver(measure);
resize.observe(nav);
resize.observe(article);
measure();
