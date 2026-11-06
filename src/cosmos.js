import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { onPage } from "./page-lifecycle.js";
import { references, starDistance, starName, starPosition } from "./star-catalog.js";
import { cameraFlight, sampleFlight, flightSeconds, inwardOffset } from "./cosmos-flight.js";
import {
  createSolarSystem,
  lightYearsPerAU,
  orbitEpoch,
  millisecondsPerDay,
  orbitDaysPerSecond,
} from "./solar-system.js";

onPage("[data-cosmos-stage]", async (stage, { on, dispose, signal }) => {
  const canvas = stage.querySelector("canvas");
  const status = document.querySelector("[data-cosmos-status]");
  const pauseButton = document.querySelector("[data-cosmos-pause]");
  const readout = stage.querySelector("[data-cosmos-readout]");
  const orbitClock = stage.querySelector("[data-cosmos-orbit-clock]");
  const orbitTime = orbitClock.querySelector("time");
  const picker = document.querySelector("[data-cosmos-reference]");
  const distance = document.querySelector("[data-cosmos-distance]");
  const labelLayer = stage.querySelector("[data-cosmos-labels]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  on(picker, "change", () => {
    distance.textContent = `${picker.selectedOptions[0].dataset.distance} light-years from Earth`;
  });
  picker.disabled = false;
  let renderer;
  let catalogLoaded = false;
  let controls;
  let observer;
  let resize;
  let disposed = false;
  const geometries = new Set();
  const materials = new Set();
  const geometry = (value) => {
    geometries.add(value);
    return value;
  };
  const material = (value) => {
    materials.add(value);
    return value;
  };
  function destroy() {
    if (disposed) return;
    disposed = true;
    renderer?.setAnimationLoop(null);
    observer?.disconnect();
    resize?.disconnect();
    controls?.dispose();
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    labelLayer.replaceChildren();
  }
  dispose(destroy);
  try {
    const response = await fetch("/data/nearby-stars.json", { signal });
    if (!response.ok) throw new Error("catalog");
    const catalog = await response.json();
    if (signal.aborted) return;
    const landmarks = references(catalog);
    catalogLoaded = true;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor("#06070b", 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
    controls = new OrbitControls(camera, canvas);
    controls.cursorStyle = "grab";
    controls.enableDamping = !reducedMotion.matches;
    controls.enablePan = false;
    controls.minDistance = 0.02 * lightYearsPerAU;
    controls.maxDistance = 900;
    controls.autoRotateSpeed = 0.18;
    let paused = reducedMotion.matches;
    let inView = true;
    let dirty = true;
    let seed;
    let lastTime = 0;
    const homePosition = new THREE.Vector3();
    const previousPosition = new THREE.Vector3();
    let flight = null;
    let flightFocus;
    let cameraSpeed = 0;
    let orbitDays = (Date.now() - orbitEpoch) / millisecondsPerDay;
    let clockTime = -Infinity;
    stage.dataset.flight = "idle";
    stage.dataset.focus = "neighborhood";
    const invalidate = () => {
      dirty = true;
    };
    controls.addEventListener("change", invalidate);
    dispose(() => controls.removeEventListener("change", invalidate));

    const neighborhoodCenter = new THREE.Vector3();
    const positions = [],
      colors = [],
      sizes = [];
    const blue = new THREE.Color("#d6e5ff");
    const cream = new THREE.Color("#fff7e5");
    const amber = new THREE.Color("#efa46e");
    const color = new THREE.Color();
    for (const star of catalog.stars) {
      const position = starPosition(star);
      positions.push(...position);
      neighborhoodCenter.x += position[0];
      neighborhoodCenter.y += position[1];
      neighborhoodCenter.z += position[2];
      const index = star[6];
      color.copy(blue);
      if (index === null) color.set("#e8e8e8");
      else if (index < 0.6) color.lerp(cream, THREE.MathUtils.clamp((index + 0.3) / 0.9, 0, 1));
      else color.set("#fff7e5").lerp(amber, THREE.MathUtils.clamp((index - 0.6) / 1.4, 0, 1));
      colors.push(color.r, color.g, color.b);
      sizes.push(star[0] === 0 ? 5 : THREE.MathUtils.clamp(3.1 - star[5] * 0.15, 0.8, 3.8));
    }
    neighborhoodCenter.divideScalar(catalog.stars.length);
    const stars = new THREE.Points(
      geometry(
        new THREE.BufferGeometry()
          .setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
          .setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
          .setAttribute("starSize", new THREE.Float32BufferAttribute(sizes, 1)),
      ),
      material(
        new THREE.ShaderMaterial({
          uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
          vertexShader: `
          attribute vec3 color;
          attribute float starSize;
          uniform float pixelRatio;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 view = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * view;
            gl_PointSize = clamp(starSize * 200.0 / max(1.0, -view.z), 0.75, 7.0) * pixelRatio;
          }`,
          fragmentShader: `
          varying vec3 vColor;
          void main() {
            float radius = length(gl_PointCoord - 0.5) * 2.0;
            float alpha = 1.0 - smoothstep(0.15, 1.0, radius);
            if (alpha < 0.02) discard;
            gl_FragColor = vec4(vColor, alpha);
            #include <colorspace_fragment>
          }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    scene.add(stars);
    const guideGeometry = geometry(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    );
    const guide = new THREE.Line(
      guideGeometry,
      material(new THREE.LineBasicMaterial({ color: "#fba388", transparent: true, opacity: 0.35 })),
    );
    scene.add(guide);
    const marker = new THREE.Points(
      geometry(
        new THREE.BufferGeometry()
          .setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3))
          .setAttribute(
            "color",
            new THREE.Float32BufferAttribute(new THREE.Color("#fba388").toArray(), 3),
          )
          .setAttribute("starSize", new THREE.Float32BufferAttribute([7], 1)),
      ),
      stars.material,
    );
    scene.add(marker);
    const labels = landmarks.map((star) => {
      const node = document.createElement("span");
      node.className = "cosmos-star-label";
      const name = document.createElement("strong");
      name.textContent = starName(star);
      const value = document.createElement("span");
      value.textContent = starDistance(star).toFixed(2) + " ly";
      node.append(name, value);
      labelLayer.append(node);
      return { star, node, position: new THREE.Vector3(...starPosition(star)) };
    });
    const solar = createSolarSystem(geometry, material);
    scene.add(solar.group);
    const solarLabels = solar.bodies.map((body) => {
      const node = document.createElement("span");
      node.className = "cosmos-star-label";
      node.dataset.solarBody = body.name;
      const name = document.createElement("strong");
      name.textContent = body.name;
      const value = document.createElement("span");
      value.textContent = body.a ? `${body.a.toFixed(2)} AU orbit` : "0 AU · origin";
      value.className = "keep-case";
      node.append(name, value);
      labelLayer.append(node);
      return { body, node, position: new THREE.Vector3() };
    });
    let selected;
    let solarDetail = false;
    function describeDistance() {
      distance.textContent =
        solarDetail && selected[0] === 0
          ? "Earth–Sun ≈ 1 AU"
          : `${starDistance(selected).toFixed(2)} light-years from Earth`;
    }
    function selectStar(fly = false) {
      selected = landmarks.find((star) => String(star[0]) === picker.value);
      describeDistance();
      const position = new THREE.Vector3(...starPosition(selected));
      guideGeometry.setFromPoints([new THREE.Vector3(), position]);
      guideGeometry.computeBoundingSphere();
      marker.position.copy(position);
      if (fly) focusSelected();
      dirty = true;
    }
    on(picker, "change", () => selectStar(true));
    selectStar();

    function fitView() {
      const fit =
        110 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
      const angle = (seed / 4294967296) * Math.PI * 2 + 0.55;
      homePosition.set(Math.sin(angle), 0.34, Math.cos(angle)).normalize().multiplyScalar(fit);
    }
    function interruptFlight() {
      if (!flight) return;
      flight = null;
      stage.dataset.flight = "interrupted";
      controls.enableDamping = !reducedMotion.matches;
      controls.autoRotate = !paused;
      dirty = true;
    }
    controls.addEventListener("start", interruptFlight);
    dispose(() => controls.removeEventListener("start", interruptFlight));
    function finishFlight() {
      sampleFlight(flight, 1, camera.position, controls.target);
      flight = null;
      stage.dataset.flight = "idle";
      stage.dataset.focus = flightFocus;
      controls.enableDamping = !reducedMotion.matches;
      controls.autoRotate = !paused;
      dirty = true;
    }
    function focusSelected() {
      controls.autoRotate = false;
      controls.enableDamping = false;
      controls.update(0);
      const destination = new THREE.Vector3(...starPosition(selected));
      const offset = inwardOffset(
        destination,
        neighborhoodCenter,
        selected[0] === 0 ? 20 * lightYearsPerAU : 0.8,
        seed,
      );
      flight = cameraFlight(camera.position, controls.target, destination, offset);
      flightFocus = String(selected[0]);
      stage.dataset.flight = "flying";
      if (reducedMotion.matches) {
        finishFlight();
        controls.update(0);
        previousPosition.copy(camera.position);
      }
      dirty = true;
    }
    function resetView() {
      focusSelected();
    }
    function viewpoint(nextSeed, fly = true) {
      seed = nextSeed >>> 0;
      stage.dataset.seed = String(seed);
      if (fly) focusSelected();
      else {
        fitView();
        controls.target.set(0, 0, 0);
        camera.position.copy(homePosition);
        camera.lookAt(controls.target);
        controls.update(0);
        previousPosition.copy(camera.position);
        dirty = true;
      }
    }
    function updatePause() {
      controls.autoRotate = !paused && !flight;
      pauseButton.textContent = paused ? "Resume" : "Pause";
      pauseButton.setAttribute("aria-pressed", String(paused));
      dirty = true;
    }
    function placeLabels() {
      const width = stage.clientWidth,
        height = stage.clientHeight;
      const occupied = [];
      for (const label of [...solarLabels, ...labels]) label.node.hidden = true;
      if (solarDetail)
        for (const label of solarLabels) label.body.mesh.getWorldPosition(label.position);
      const activeLabels = solarDetail
        ? [...solarLabels, ...labels.filter((label) => label.star[0] !== 0)]
        : labels;
      const priority = (label) =>
        label.body
          ? label.body.name === "Sun"
            ? 3
            : label.body.name === "Earth"
              ? 2
              : 0
          : label.star === selected
            ? 4
            : label.star[0] === 0
              ? 2
              : 0;
      const ordered = [...activeLabels].sort((a, b) => priority(b) - priority(a));
      const limit = width < 700 ? 5 : 9;
      for (const label of ordered) {
        const point = label.position.clone().project(camera);
        const x = ((point.x + 1) * width) / 2;
        const y = ((1 - point.y) * height) / 2;
        const landscape = height < 500;
        const candidates = [
          [x + 9, y - 12],
          [x - 150, y - 12],
          [x + 9, y - 48],
          [x - 150, y + 16],
        ];
        const placement = candidates
          .map(([left, top]) => ({ left, top, right: left + 140, bottom: top + 35 }))
          .find((rect) => {
            const overlap = occupied.some(
              (old) =>
                rect.left < old.right &&
                rect.right > old.left &&
                rect.top < old.bottom &&
                rect.bottom > old.top,
            );
            const panel = landscape
              ? rect.right > width - 280 && rect.top < 260
              : rect.left < 320 && rect.top < 360;
            return (
              rect.left >= 12 &&
              rect.right <= width - 12 &&
              rect.top >= (landscape ? 90 : 185) &&
              rect.bottom <= height - (landscape ? 100 : width < 700 ? 340 : 175) &&
              !panel &&
              !overlap
            );
          });
        const hidden = !placement || point.z < -1 || point.z > 1 || occupied.length >= limit;
        label.node.hidden = hidden;
        label.node.toggleAttribute(
          "data-selected",
          label.body ? label.body.name === "Sun" : label.star === selected,
        );
        if (hidden) continue;
        label.node.style.transform = `translate3d(${placement.left}px,${placement.top}px,0)`;
        occupied.push(placement);
      }
    }
    function frame(time) {
      const elapsed = Math.max((time - lastTime) / 1000, 0.000001);
      const delta = Math.min(elapsed, 0.05);
      lastTime = time;
      if (flight) {
        flight.elapsed += elapsed;
        sampleFlight(flight, flight.elapsed / flightSeconds, camera.position, controls.target);
        if (flight.elapsed >= flightSeconds) finishFlight();
        dirty = true;
      }
      if (controls.update(flight ? 0 : delta)) dirty = true;
      const speed = camera.position.distanceTo(previousPosition) / elapsed;
      previousPosition.copy(camera.position);
      if (speed !== cameraSpeed) dirty = true;
      cameraSpeed = speed;
      if (!paused) {
        orbitDays += elapsed * orbitDaysPerSecond;
        dirty = true;
      }
      if (!dirty) return;
      const range = camera.position.distanceTo(controls.target);
      camera.near = Math.max(1e-11, Math.min(0.1, range * 0.002));
      camera.updateProjectionMatrix();
      solar.update(orbitDays, camera, stage.clientHeight);
      solarDetail = camera.position.length() / lightYearsPerAU < 400;
      const scale = solarDetail ? "solar" : "stellar";
      if (stage.dataset.scale !== scale) {
        stage.dataset.scale = scale;
        document.querySelector(".cosmos-heading > p").textContent = solarDetail
          ? "Our solar system"
          : "Our stellar neighborhood";
        document.querySelector(".cosmos-scale").textContent = solarDetail
          ? "Planetary orbits · astronomical units"
          : "100 light-year radius · linear positions";
        describeDistance();
      }
      orbitClock.hidden = !solarDetail;
      if (solarDetail && (time - clockTime > 200 || paused)) {
        const date = new Date(orbitEpoch + orbitDays * millisecondsPerDay);
        orbitTime.dateTime = date.toISOString();
        orbitTime.textContent = `orbit ${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
        clockTime = time;
      }
      renderer.render(scene, camera);
      placeLabels();
      const units = solarDetail ? lightYearsPerAU : 1;
      const unit = solarDetail ? "AU" : "ly";
      readout.textContent = `camera ${(cameraSpeed / units).toFixed(2)} ${unit}/s · range ${(range / units).toFixed(2)} ${unit}\nθ ${controls.getAzimuthalAngle().toFixed(2)} / ${(camera.position.length() / units).toFixed(solarDetail ? 2 : 1)} ${unit} from origin`;
      dirty = false;
    }
    function syncLoop() {
      if (disposed) return;
      lastTime = performance.now();
      renderer.setAnimationLoop(inView && !document.hidden ? frame : null);
    }
    observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncLoop();
    });
    observer.observe(stage);
    let viewSized = false;
    resize = new ResizeObserver(() => {
      if (disposed || !stage.clientWidth || !stage.clientHeight) return;
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      if (!viewSized && stage.dataset.focus === "neighborhood" && !flight) viewpoint(seed, false);
      viewSized = true;
      dirty = true;
    });
    resize.observe(stage);
    on(document, "visibilitychange", syncLoop);
    on(window, "pageshow", syncLoop);
    on(window, "pagehide", (event) => {
      renderer.setAnimationLoop(null);
      if (!event.persisted) destroy();
    });
    on(canvas, "site:before-capture", () => renderer.render(scene, camera));
    on(pauseButton, "click", () => {
      paused = !paused;
      if (paused) interruptFlight();
      updatePause();
    });
    on(reducedMotion, "change", () => {
      controls.enableDamping = !reducedMotion.matches;
      if (reducedMotion.matches) {
        paused = true;
        if (flight) finishFlight();
        previousPosition.copy(camera.position);
      }
      updatePause();
    });
    on(document.querySelector("[data-cosmos-shuffle]"), "click", () => {
      viewpoint(crypto.getRandomValues(new Uint32Array(1))[0]);
      const url = new URL(location.href);
      url.searchParams.set("seed", String(seed));
      history.replaceState(history.state, "", url);
    });
    on(document.querySelector("[data-cosmos-reset]"), "click", resetView);
    on(canvas, "keydown", (event) => {
      const spherical = new THREE.Spherical().setFromVector3(
        camera.position.clone().sub(controls.target),
      );
      if (event.key === "ArrowLeft") spherical.theta -= 0.15;
      else if (event.key === "ArrowRight") spherical.theta += 0.15;
      else if (event.key === "ArrowUp") spherical.phi -= 0.15;
      else if (event.key === "ArrowDown") spherical.phi += 0.15;
      else if (["+", "=", "-"].includes(event.key))
        spherical.radius = THREE.MathUtils.clamp(
          spherical.radius * (event.key === "-" ? 1.12 : 0.89),
          controls.minDistance,
          controls.maxDistance,
        );
      else if (event.key === " ") {
        paused = !paused;
        updatePause();
      } else return;
      interruptFlight();
      spherical.makeSafe();
      camera.position.setFromSpherical(spherical).add(controls.target);
      controls.update();
      dirty = true;
      event.preventDefault();
    });
    viewpoint(Number(new URLSearchParams(location.search).get("seed") ?? 123), false);
    updatePause();
    stage.dataset.stars = String(catalog.stars.length);
    stage.dataset.ready = "";
    status.textContent = `${catalog.stars.length.toLocaleString("en-US")} catalogued stars · 100 ly radius`;
    document.querySelector("[data-cosmos-controls]").hidden = false;
    syncLoop();
  } catch {
    if (signal.aborted) return;
    const webglStarted = Boolean(renderer);
    destroy();
    status.textContent = webglStarted
      ? "Star map unavailable. Reference distances remain available."
      : catalogLoaded
        ? "WebGL unavailable. Reference distances remain available."
        : "Star catalog unavailable. Reference distances remain available.";
  }
});
