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
    if (child.isInstancedMesh) child.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function sculpture(seed) {
  const random = randomFrom(seed);
  const group = new THREE.Group();
  const time = { value: 0 };
  const phase = random() * Math.PI * 2;
  const winding = 3 + Math.floor(random() * 3) * 2;
  const positions = [];
  const indices = [];
  const segments = 360;
  const across = 6;
  const halfWidth = 0.14 + random() * 0.16;
  const center = (t) => {
    const radius = 1.55 + 0.5 * Math.cos(winding * t + phase);
    return new THREE.Vector3(
      radius * Math.cos(2 * t),
      radius * Math.sin(2 * t),
      0.85 * Math.sin(winding * t + phase),
    );
  };
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const point = center(t);
    const tangent = center(t + 0.001)
      .sub(point)
      .normalize();
    const normal = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
    const binormal = tangent.clone().cross(normal).normalize();
    const bank = t * 2 + phase;
    const side = normal.multiplyScalar(Math.cos(bank)).addScaledVector(binormal, Math.sin(bank));
    for (let j = 0; j <= across; j++) {
      const width = halfWidth * (1 + 0.3 * Math.sin(t * 5 + phase));
      const vertex = point.clone().addScaledVector(side, ((j / across) * 2 - 1) * width);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i < segments && j < across) {
        const a = i * (across + 1) + j;
        const b = a + across + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const vertexShader = `
    uniform float time;
    uniform float phase;
    varying vec3 vNormal;
    varying vec3 vView;
    varying vec3 vPosition;
    void main() {
      vec3 p = position;
      p += normal * sin(p.y * 3.0 + time * 1.2 + phase) * 0.13;
      p.x += sin(p.z * 2.4 - time * 0.7 + phase) * 0.18;
      p.y += cos(p.x * 2.0 + time * 0.6 + phase) * 0.12;
      vec4 view = modelViewMatrix * vec4(p, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = -view.xyz;
      vPosition = p;
      gl_Position = projectionMatrix * view;
    }
  `;
  const fragmentShader = `
    uniform float time;
    uniform float phase;
    uniform vec3 colorA;
    uniform vec3 colorB;
    varying vec3 vNormal;
    varying vec3 vView;
    varying vec3 vPosition;
    void main() {
      vec3 n = normalize(vNormal);
      float facing = abs(dot(n, normalize(vView)));
      float rim = pow(1.0 - facing, 2.0);
      float band = 0.5 + 0.5 * sin(vPosition.z * 3.0 + time * 0.65 + phase);
      vec3 color = mix(colorA, colorB, band);
      float light = 0.3 + 0.7 * abs(dot(n, normalize(vec3(0.5, 0.8, 1.0))));
      gl_FragColor = vec4(color * light + colorB * rim * 1.2, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;
  const ribbons = [];
  for (let i = 0; i < 3; i++) {
    const hue = (random() * 0.15 + i / 3 + 0.48) % 1;
    const uniforms = {
      time,
      phase: { value: phase + i * 2 },
      colorA: { value: new THREE.Color().setHSL(hue, 0.8, 0.58) },
      colorB: { value: new THREE.Color().setHSL((hue + 0.22) % 1, 0.75, 0.75) },
    };
    const ribbon = new THREE.Group();
    ribbon.add(
      new THREE.Mesh(
        geometry,
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader,
          fragmentShader,
          side: THREE.DoubleSide,
        }),
      ),
    );
    const wire = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader: `
        uniform vec3 colorB;
        void main() {
          gl_FragColor = vec4(colorB, 0.16);
          #include <colorspace_fragment>
        }
      `,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    wire.scale.setScalar(1.002);
    ribbon.add(wire);
    ribbon.rotation.set((i * Math.PI) / 3, i * 0.7, i * 0.4);
    ribbon.userData.scale = 1.6 - i * 0.3;
    ribbon.scale.setScalar(ribbon.userData.scale);
    ribbons.push(ribbon);
    group.add(ribbon);
  }

  const network = new THREE.Group();
  const nodeGeometry = new THREE.OctahedronGeometry(0.07);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: "#f9b9ed", wireframe: true });
  const nodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, 64);
  const matrix = new THREE.Matrix4();
  const points = [];
  for (let i = 0; i < nodes.count; i++) {
    const y = 1 - (i / (nodes.count - 1)) * 2;
    const theta = i * Math.PI * (3 - Math.sqrt(5)) + random() * 0.4;
    const radius = 3.5 + random() * 2;
    const point = new THREE.Vector3(
      Math.cos(theta) * Math.sqrt(1 - y * y),
      y,
      Math.sin(theta) * Math.sqrt(1 - y * y),
    ).multiplyScalar(radius);
    points.push(point);
    nodes.setMatrixAt(i, matrix.makeTranslation(point.x, point.y, point.z));
  }
  network.add(nodes);
  const connections = [];
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
  network.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(connections, 3),
      ),
      new THREE.LineBasicMaterial({ color: "#bfa4ee", transparent: true, opacity: 0.17 }),
    ),
  );
  group.add(network);

  const cages = [];
  for (const [radius, color] of [
    [4.2, "#e8ab7c"],
    [5.8, "#7cd4d7"],
  ]) {
    const solid = new THREE.IcosahedronGeometry(radius, 0);
    const cage = new THREE.LineSegments(
      new THREE.EdgesGeometry(solid),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 }),
    );
    solid.dispose();
    cages.push(cage);
    group.add(cage);
  }
  const orbits = [];
  for (let i = 0; i < 5; i++) {
    const points = Array.from({ length: 180 }, (_, j) => {
      const angle = (j / 180) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * (4.8 + i * 0.65),
        Math.sin(angle) * (2.1 + i * 0.25),
        0,
      );
    });
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: i % 2 ? "#a18de0" : "#87d9d0",
        transparent: true,
        opacity: 0.25,
      }),
    );
    orbit.rotation.set(i * 0.65, i * 0.4, i * 0.5);
    orbits.push(orbit);
    group.add(orbit);
  }

  const starPositions = [];
  const starColors = [];
  for (let i = 0; i < 2600; i++) {
    const point = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5)
      .normalize()
      .multiplyScalar(7 + random() * 28);
    starPositions.push(...point.toArray());
    const color = new THREE.Color().setHSL(0.5 + random() * 0.35, 0.35, 0.6 + random() * 0.3);
    starColors.push(color.r, color.g, color.b);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry()
      .setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3))
      .setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3)),
    new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(stars);
  group.rotation.set(0.2, 0.6, -0.1);
  return {
    group,
    nodes: [nodes],
    animate(elapsed) {
      time.value = elapsed;
      ribbons.forEach((ribbon, i) => {
        ribbon.rotation.y = i * 0.7 + elapsed * (i % 2 ? -0.16 : 0.12);
        ribbon.rotation.z = i * 0.4 + Math.sin(elapsed * 0.4 + i) * 0.22;
        ribbon.scale.setScalar(ribbon.userData.scale * (1 + Math.sin(elapsed * 0.6 + i) * 0.06));
      });
      network.rotation.set(elapsed * -0.04, elapsed * 0.06, 0);
      cages.forEach((cage, i) =>
        cage.rotation.set(elapsed * (i ? -0.08 : 0.1), i + elapsed * 0.05, i * 0.6),
      );
      orbits.forEach((orbit, i) => {
        orbit.rotation.z = i * 0.5 + elapsed * (i % 2 ? -0.035 : 0.045);
      });
      stars.rotation.y = elapsed * -0.012;
    },
  };
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor("#06070b");
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 3.5;
  controls.maxDistance = 18;

  let paused = reducedMotion.matches;
  let dirty = true;
  let seed;
  let object;
  let lastTime = 0;
  let sceneTime = 0;
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
    sceneTime = 0;
    object.animate(sceneTime);
    scene.add(object.group);
    stage.dataset.seed = String(seed);
    status.textContent = "Seed: " + seed.toString(16).padStart(8, "0");
    dirty = true;
  }
  function frame(time) {
    const elapsed = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (!paused) {
      sceneTime += elapsed;
      object.animate(sceneTime);
      object.group.rotation.y += elapsed * 0.11;
      object.group.rotation.x += elapsed * 0.045;
      object.group.rotation.z += elapsed * 0.025;
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
    const hit = raycaster.intersectObjects(object.nodes)[0];
    hovered = hit ? "NODE " + String(hit.instanceId + 1).padStart(2, "0") : "";
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
