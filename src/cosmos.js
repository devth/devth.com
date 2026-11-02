import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { onPage } from "./page-lifecycle.js";
import { references, starDistance, starName, starPosition } from "./star-catalog.js";

onPage("[data-cosmos-stage]", async (stage, { on, dispose, signal }) => {
  const canvas = stage.querySelector("canvas");
  const status = document.querySelector("[data-cosmos-status]");
  const pauseButton = document.querySelector("[data-cosmos-pause]");
  const readout = stage.querySelector("[data-cosmos-readout]");
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
    controls.enableDamping = !reducedMotion.matches;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 900;
    controls.autoRotateSpeed = 0.18;
    let paused = reducedMotion.matches;
    let inView = true;
    let dirty = true;
    let seed;
    let lastTime = 0;
    const homePosition = new THREE.Vector3();
    const invalidate = () => {
      dirty = true;
    };
    controls.addEventListener("change", invalidate);
    dispose(() => controls.removeEventListener("change", invalidate));

    const positions = [],
      colors = [],
      sizes = [];
    const blue = new THREE.Color("#d6e5ff");
    const cream = new THREE.Color("#fff7e5");
    const amber = new THREE.Color("#efa46e");
    const color = new THREE.Color();
    for (const star of catalog.stars) {
      positions.push(...starPosition(star));
      const index = star[6];
      color.copy(blue);
      if (index === null) color.set("#e8e8e8");
      else if (index < 0.6) color.lerp(cream, THREE.MathUtils.clamp((index + 0.3) / 0.9, 0, 1));
      else color.set("#fff7e5").lerp(amber, THREE.MathUtils.clamp((index - 0.6) / 1.4, 0, 1));
      colors.push(color.r, color.g, color.b);
      sizes.push(star[0] === 0 ? 5 : THREE.MathUtils.clamp(3.1 - star[5] * 0.15, 0.8, 3.8));
    }
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
    let selected;
    function selectStar() {
      selected = landmarks.find((star) => String(star[0]) === picker.value);
      distance.textContent = `${starDistance(selected).toFixed(2)} light-years from Earth`;
      const position = new THREE.Vector3(...starPosition(selected));
      guideGeometry.setFromPoints([new THREE.Vector3(), position]);
      guideGeometry.computeBoundingSphere();
      marker.position.copy(position);
      dirty = true;
    }
    on(picker, "change", selectStar);
    selectStar();

    function fitView() {
      const fit =
        110 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
      const angle = (seed / 4294967296) * Math.PI * 2 + 0.55;
      homePosition.set(Math.sin(angle), 0.34, Math.cos(angle)).normalize().multiplyScalar(fit);
    }
    function resetView() {
      fitView();
      controls.target.set(0, 0, 0);
      camera.position.copy(homePosition);
      camera.lookAt(controls.target);
      controls.update();
      dirty = true;
    }
    function viewpoint(nextSeed) {
      seed = nextSeed >>> 0;
      stage.dataset.seed = String(seed);
      resetView();
    }
    function updatePause() {
      controls.autoRotate = !paused;
      pauseButton.textContent = paused ? "Resume" : "Pause";
      pauseButton.setAttribute("aria-pressed", String(paused));
      dirty = true;
    }
    function placeLabels() {
      const width = stage.clientWidth,
        height = stage.clientHeight;
      const occupied = [];
      const priority = (label) => (label.star[0] === 0 ? 2 : Number(label.star === selected));
      const ordered = [...labels].sort((a, b) => priority(b) - priority(a));
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
              rect.bottom <= height - (landscape ? 100 : width < 700 ? 245 : 175) &&
              !panel &&
              !overlap
            );
          });
        const hidden = !placement || point.z < -1 || point.z > 1 || occupied.length >= limit;
        label.node.hidden = hidden;
        label.node.toggleAttribute("data-selected", label.star === selected);
        if (hidden) continue;
        label.node.style.transform = `translate3d(${placement.left}px,${placement.top}px,0)`;
        occupied.push(placement);
      }
    }
    function frame(time) {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (controls.update(delta)) dirty = true;
      if (!dirty) return;
      renderer.render(scene, camera);
      placeLabels();
      readout.textContent = `θ ${controls.getAzimuthalAngle().toFixed(2)} / ${camera.position.length().toFixed(1)} ly from origin`;
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
    resize = new ResizeObserver(() => {
      if (disposed || !stage.clientWidth || !stage.clientHeight) return;
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      resetView();
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
      updatePause();
    });
    on(reducedMotion, "change", () => {
      controls.enableDamping = !reducedMotion.matches;
      if (reducedMotion.matches) paused = true;
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
      spherical.makeSafe();
      camera.position.setFromSpherical(spherical).add(controls.target);
      controls.update();
      dirty = true;
      event.preventDefault();
    });
    viewpoint(Number(new URLSearchParams(location.search).get("seed") ?? 123));
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
