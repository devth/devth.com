import { readFileSync } from "node:fs";
import { references, starDistance, starName } from "../src/star-catalog.js";

const catalog = JSON.parse(
  readFileSync(new URL("../public/data/nearby-stars.json", import.meta.url)),
);
const landmarks = references(catalog);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

export const cosmosBody = `
<section class="cosmos" aria-labelledby="cosmos-title">
  <header class="cosmos-heading">
    <h1 id="cosmos-title">Cosmos</h1>
    <p>Our stellar neighborhood</p>
    <p class="cosmos-scale">100 light-year radius · linear positions</p>
  </header>
  <div class="cosmos-stage" data-cosmos-stage>
    <canvas class="cosmos-canvas" aria-label="Interactive 3D stellar neighborhood. Catalogued stars within 100 light-years. Drag to orbit. Use the arrow keys to turn, plus and minus to zoom." tabindex="0"></canvas>
    <div class="cosmos-labels" data-cosmos-labels aria-hidden="true"></div>
    <span class="cosmos-coordinate keep-case" data-cosmos-readout aria-hidden="true"></span>
  </div>
  <aside class="cosmos-reference" aria-label="Stellar references">
    <label for="cosmos-reference">Reference star</label>
    <select id="cosmos-reference" data-cosmos-reference disabled>
      ${landmarks.map((star) => `<option value="${star[0]}" data-distance="${starDistance(star).toFixed(2)}"${star[1] === "Proxima Centauri" ? " selected" : ""}>${escape(starName(star))}</option>`).join("")}
    </select>
    <p class="cosmos-distance" data-cosmos-distance>4.23 light-years from Earth</p>
    <details class="cosmos-reference-list">
      <summary>Reference distances</summary>
      <dl>${landmarks.map((star) => `<div><dt>${escape(starName(star))}</dt><dd>${starDistance(star).toFixed(2)} ly</dd></div>`).join("")}</dl>
      <p>Approximate catalog distances. Earth and the Sun share the origin at this scale.</p>
    </details>
  </aside>
  <div class="cosmos-controls" data-cosmos-controls hidden>
    <div class="cosmos-buttons">
      <button type="button" data-cosmos-pause aria-pressed="false">Pause</button>
      <button type="button" data-cosmos-shuffle>New viewpoint</button>
      <button type="button" data-cosmos-reset>Recenter</button>
    </div>
    <p>DRAG TO ORBIT <span aria-hidden="true">/</span> PINCH TO ZOOM<br>KEYBOARD: ARROWS, + / −</p>
  </div>
  <p class="cosmos-status" data-cosmos-status role="status"></p>
  <p class="cosmos-source">Positions: <a href="https://github.com/astronexus/HYG-Database">HYG 4.1</a> · J2000 · <a href="/data/README.md">data &amp; license</a><br>Star sizes and brightness exaggerated; catalog sample, not a complete census.</p>
  <noscript><p class="cosmos-status">3D needs JavaScript. Reference distances remain available.</p></noscript>
  <div class="cosmos-colophon"><a href="/">Home ↗</a></div>
</section>
`;
