import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const stage = document.querySelector("[data-cosmos-stage]");
const canvas = stage.querySelector("canvas");
const status = document.querySelector("[data-cosmos-status]");
const pauseButton = document.querySelector("[data-cosmos-pause]");
const readout = document.querySelector("[data-cosmos-readout]");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function randomFrom(seed) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function disposeObject(object) {
  const geometries = new Set();
  const materials = new Set();
  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) materials.add(child.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function sculpture(seed) {
  const random = randomFrom(seed);
  const group = new THREE.Group();
  const nodes = [];
  const segments = 320;
  const across = 4;
  const positions = [];
  const indices = [];
  const edges = [];
  const halfWidth = 0.13 + random() * 0.13;
  const phase = random() * Math.PI * 2;
  const center = (t) =>
    new THREE.Vector3(
      (Math.sin(t) + 2 * Math.sin(2 * t)) * 0.57,
      (Math.cos(t) - 2 * Math.cos(2 * t)) * 0.57,
      -Math.sin(3 * t) * 0.65,
    );
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const point = center(t);
    const tangent = center(t + 0.001)
      .sub(point)
      .normalize();
    const normal = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
    const binormal = tangent.clone().cross(normal).normalize();
    const bank = t * 1.5 + phase;
    const side = normal.multiplyScalar(Math.cos(bank)).addScaledVector(binormal, Math.sin(bank));
    for (let j = 0; j <= across; j++) {
      const vertex = point.clone().addScaledVector(side, ((j / across) * 2 - 1) * halfWidth);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i < segments && j < across) {
        const a = i * (across + 1) + j;
        const b = a + across + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    if (i % 8 === 0) {
      const a = point.clone().addScaledVector(side, -halfWidth);
      const b = point.clone().addScaledVector(side, halfWidth);
      edges.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(
    new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: "#c9cbbb",
        metalness: 0.42,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    ),
  );
  const ink = new THREE.LineBasicMaterial({ color: "#f1dfb8", transparent: true, opacity: 0.55 });
  for (const side of [0, across]) {
    const border = [];
    for (let i = 0; i <= segments; i++) {
      const offset = (i * (across + 1) + side) * 3;
      border.push(...positions.slice(offset, offset + 3));
    }
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(border, 3),
        ),
        ink,
      ),
    );
  }
  group.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(edges, 3),
      ),
      ink,
    ),
  );

  const nodeGeometry = new THREE.SphereGeometry(0.035, 10, 8);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: "#e58c66" });
  const connections = [];
  const points = [];
  for (let i = 0; i < 28; i++) {
    const y = 1 - (i / 27) * 2;
    const theta = i * Math.PI * (3 - Math.sqrt(5)) + random() * 0.25;
    const radius = 2.35 + random() * 0.65;
    const point = new THREE.Vector3(
      Math.cos(theta) * Math.sqrt(1 - y * y),
      y,
      Math.sin(theta) * Math.sqrt(1 - y * y),
    ).multiplyScalar(radius);
    points.push(point);
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.copy(point);
    node.userData.label = "NODE " + String(i + 1).padStart(2, "0");
    nodes.push(node);
    group.add(node);
  }
  const pairs = new Set();
  for (let i = 0; i < points.length; i++) {
    const nearest = points
      .map((point, j) => ({ j, distance: points[i].distanceToSquared(point) }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    for (const { j } of nearest) {
      const key = [Math.min(i, j), Math.max(i, j)].join("-");
      if (pairs.has(key)) continue;
      pairs.add(key);
      connections.push(...points[i].toArray(), ...points[j].toArray());
    }
  }
  group.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(connections, 3),
      ),
      new THREE.LineBasicMaterial({ color: "#a7b7ad", transparent: true, opacity: 0.19 }),
    ),
  );
  const starPositions = [];
  for (let i = 0; i < 650; i++) {
    const vector = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5)
      .normalize()
      .multiplyScalar(7 + random() * 12);
    starPositions.push(...vector.toArray());
  }
  group.add(
    new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(starPositions, 3),
      ),
      new THREE.PointsMaterial({
        color: "#d6d6c9",
        size: 0.018,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      }),
    ),
  );
  group.rotation.set(0.2, 0.6, -0.1);
  return { group, nodes };
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor("#10120f");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 4.5;
  controls.maxDistance = 15;
  // Do not hijack page scrolling; pinch and keyboard zoom are sufficient.
  canvas.addEventListener("wheel", (event) => event.stopImmediatePropagation(), { capture: true });
  scene.add(new THREE.HemisphereLight("#f6f0dc", "#27382a", 2.1));
  const keyLight = new THREE.DirectionalLight("#edcdb0", 3.5);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight("#88b3d3", 2.8);
  rimLight.position.set(-4, -1, -3);
  scene.add(rimLight);

  let paused = reducedMotion.matches;
  let dirty = true;
  let seed;
  let object;
  let lastTime = 0;
  let inView = true;
  let hovered = "";
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function updatePause() {
    pauseButton.textContent = paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
  }
  function newUniverse(nextSeed) {
    if (object) {
      scene.remove(object.group);
      disposeObject(object.group);
    }
    seed = nextSeed >>> 0;
    object = sculpture(seed);
    scene.add(object.group);
    stage.dataset.seed = String(seed);
    status.textContent = "Seed: " + seed.toString(16).padStart(8, "0");
    dirty = true;
  }
  function frame(time) {
    const elapsed = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (!paused) {
      object.group.rotation.y += elapsed * 0.09;
      object.group.rotation.x += elapsed * 0.025;
      dirty = true;
    }
    if (controls.update()) dirty = true;
    if (!dirty) return;
    renderer.render(scene, camera);
    const r = object.group.rotation;
    readout.textContent =
      hovered ||
      `X ${r.x.toFixed(2)} / Y ${r.y.toFixed(2)} / Z ${r.z.toFixed(2)} / θ ${controls.getAzimuthalAngle().toFixed(2)}`;
    dirty = false;
  }
  function syncLoop() {
    lastTime = performance.now();
    renderer.setAnimationLoop(inView && !document.hidden ? frame : null);
  }
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncLoop();
  });
  observer.observe(stage);
  document.addEventListener("visibilitychange", syncLoop);
  window.addEventListener("pageshow", syncLoop);
  const resize = new ResizeObserver(() => {
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    dirty = true;
  });
  resize.observe(stage);
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    hovered = raycaster.intersectObjects(object.nodes)[0]?.object.userData.label || "";
    dirty = true;
  });
  canvas.addEventListener("pointerleave", () => {
    hovered = "";
    dirty = true;
  });
  const togglePause = () => {
    paused = !paused;
    updatePause();
  };
  pauseButton.addEventListener("click", togglePause);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      paused = true;
      updatePause();
    }
  });
  document.querySelector("[data-cosmos-shuffle]").addEventListener("click", () => {
    newUniverse(crypto.getRandomValues(new Uint32Array(1))[0]);
    const url = new URL(location.href);
    url.searchParams.set("seed", String(seed));
    history.replaceState(null, "", url);
  });
  document.querySelector("[data-cosmos-reset]").addEventListener("click", () => {
    controls.reset();
    object.group.rotation.set(0.2, 0.6, -0.1);
    dirty = true;
  });
  canvas.addEventListener("keydown", (event) => {
    const r = object.group.rotation;
    if (event.key === "ArrowLeft") r.y -= 0.15;
    else if (event.key === "ArrowRight") r.y += 0.15;
    else if (event.key === "ArrowUp") r.x -= 0.15;
    else if (event.key === "ArrowDown") r.x += 0.15;
    else if (["+", "=", "-"].includes(event.key)) {
      const distance = THREE.MathUtils.clamp(
        camera.position.length() * (event.key === "-" ? 1.12 : 0.89),
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.setLength(distance);
    } else if (event.key === " ") togglePause();
    else return;
    event.preventDefault();
    dirty = true;
  });
  window.addEventListener("pagehide", (event) => {
    renderer.setAnimationLoop(null);
    if (!event.persisted) {
      observer.disconnect();
      resize.disconnect();
      disposeObject(object.group);
      controls.dispose();
      renderer.dispose();
    }
  });
  newUniverse(
    Number(
      new URLSearchParams(location.search).get("seed") ??
        crypto.getRandomValues(new Uint32Array(1))[0],
    ),
  );
  updatePause();
  document.querySelector("[data-cosmos-controls]").hidden = false;
  stage.dataset.ready = "";
  syncLoop();
}

try {
  start();
} catch {
  status.textContent = "WebGL unavailable. Showing a static image.";
}
