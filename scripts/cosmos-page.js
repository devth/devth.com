export const cosmosBody = `
<section class="cosmos" aria-labelledby="cosmos-title">
  <header class="cosmos-heading">
    <div><p class="eyebrow">LAB / 001 — NOT QUITE ANYTHING</p><h1 id="cosmos-title">A knot in<br>the nothing.</h1></div>
    <p class="cosmos-deck">A ribbon with no beginning.<br>A small, improbable universe.<br>Touch it. It won’t mind.</p>
  </header>
  <div class="cosmos-stage" data-cosmos-stage>
    <canvas class="cosmos-canvas" aria-label="Interactive 3D ribbon knot and orbital node graph. Drag to rotate. Use the arrow keys to turn, plus and minus to zoom." tabindex="0"></canvas>
    <svg class="cosmos-fallback" viewBox="0 0 800 600" role="img" aria-labelledby="fallback-title">
      <title id="fallback-title">A tangled ribbon drifting among stars</title>
      <g fill="none" stroke="#d3cec1" stroke-width="0.7">
        <ellipse cx="400" cy="300" rx="235" ry="90" transform="rotate(-35 400 300)"/>
        <ellipse cx="400" cy="300" rx="235" ry="90" transform="rotate(35 400 300)"/>
        <ellipse cx="400" cy="300" rx="235" ry="90" transform="rotate(90 400 300)"/>
        <path d="M400 65 620 400 180 400ZM165 190 635 190 400 535Z" stroke-dasharray="3 9"/>
      </g>
      <g fill="#e58c66"><circle cx="400" cy="65" r="4"/><circle cx="620" cy="400" r="4"/><circle cx="180" cy="400" r="4"/></g>
      <g fill="#d3cec1"><circle cx="90" cy="110" r="1.5"/><circle cx="680" cy="440" r="1"/><circle cx="710" cy="85" r="2"/><circle cx="120" cy="480" r="1"/></g>
    </svg>
    <span class="cosmos-coordinate" data-cosmos-readout aria-hidden="true">X +0.00 / Y +0.00 / Z +0.00</span>
    <span class="cosmos-stage-label" aria-hidden="true">FIG. 001 / SOMEWHERE, PROBABLY</span>
    <span class="cosmos-crosshair cosmos-crosshair-a" aria-hidden="true">+</span>
    <span class="cosmos-crosshair cosmos-crosshair-b" aria-hidden="true">+</span>
  </div>
  <div class="cosmos-controls" data-cosmos-controls hidden>
    <div class="cosmos-buttons">
      <button type="button" data-cosmos-pause aria-pressed="false">Pause drift</button>
      <button type="button" data-cosmos-shuffle>New universe ↗</button>
      <button type="button" data-cosmos-reset>Recenter</button>
    </div>
    <p>DRAG TO ORBIT <span aria-hidden="true">/</span> PINCH TO ZOOM<br>KEYBOARD: ARROWS, + / −</p>
  </div>
  <p class="cosmos-status" data-cosmos-status role="status">A still universe. Enable JavaScript and WebGL to set it in motion.</p>
  <div class="cosmos-colophon"><span>ONE RIBBON. NO DESTINATION.</span><a href="/">BACK TO EARTH ↗</a></div>
</section>
`;
