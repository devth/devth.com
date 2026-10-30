export const cosmosBody = `
<section class="cosmos" aria-labelledby="cosmos-title">
  <header class="cosmos-heading">
    <h1 id="cosmos-title">Cosmos</h1>
  </header>
  <div class="cosmos-stage" data-cosmos-stage>
    <canvas class="cosmos-canvas" aria-label="Interactive 3D ribbon sculpture. Drag to rotate. Use the arrow keys to turn, plus and minus to zoom." tabindex="0"></canvas>
    <span class="cosmos-coordinate keep-case" data-cosmos-readout aria-hidden="true">X +0.00 / Y +0.00 / Z +0.00</span>
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
  <p class="cosmos-status" data-cosmos-status role="status"></p>
  <div class="cosmos-colophon"><a href="/">Home ↗</a></div>
</section>
`;
