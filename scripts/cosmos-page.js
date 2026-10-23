export const cosmosBody = `
<section class="cosmos" aria-labelledby="cosmos-title">
  <header class="cosmos-heading">
    <h1 id="cosmos-title">Cosmos</h1>
  </header>
  <div class="cosmos-stage" data-cosmos-stage>
    <canvas class="cosmos-canvas" aria-label="Interactive 3D ribbon knot and orbital node graph. Drag to rotate. Use the arrow keys to turn, plus and minus to zoom." tabindex="0"></canvas>
    <svg class="cosmos-fallback" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="fallback-title">
      <title id="fallback-title">Static ribbon sculpture</title>
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
    <span class="cosmos-crosshair cosmos-crosshair-a" aria-hidden="true">+</span>
    <span class="cosmos-crosshair cosmos-crosshair-b" aria-hidden="true">+</span>
  </div>
  <div class="cosmos-controls" data-cosmos-controls hidden>
    <div class="cosmos-buttons">
      <button type="button" data-cosmos-pause aria-pressed="false">Pause</button>
      <button type="button" data-cosmos-shuffle>Randomize</button>
      <button type="button" data-cosmos-reset>Recenter</button>
    </div>
    <p>DRAG TO ORBIT <span aria-hidden="true">/</span> PINCH TO ZOOM<br>KEYBOARD: ARROWS, + / −</p>
  </div>
  <p class="cosmos-status" data-cosmos-status role="status">JavaScript and WebGL are required for 3D controls.</p>
  <div class="cosmos-colophon"><a href="/">Home ↗</a></div>
</section>
`;
