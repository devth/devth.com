import { alphaContours, strokePlan } from "./logo-geometry.js";
import { inkField } from "./logo-weave.js";
import { createGrowth } from "./organic-growth.js";
import { studyFrame, studyDrawDuration } from "./hover-studies.js";
import { chooseStructure, getHoverPreferences } from "./hover-preferences.js";

function inside(point, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}

function glyphRasters(mark) {
  const box = mark.getBoundingClientRect(),
    glyphs = [];
  const walker = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode,
      style = getComputedStyle(text.parentElement);
    const scale = parseFloat(style.fontSize) / 256;
    for (let i = 0; i < text.length; i++) {
      const character = text.textContent[i];
      if (!character.trim()) continue;
      const canvas = document.createElement("canvas"),
        context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Font raster unavailable");
      const font = `${style.fontWeight} 256px ${style.fontFamily}`;
      context.font = font;
      const metrics = context.measureText(character),
        ascent = metrics.fontBoundingBoxAscent;
      if (!Number.isFinite(ascent)) throw new Error("Font metrics unavailable");
      const x = 16 + metrics.actualBoundingBoxLeft,
        y = 16 + metrics.actualBoundingBoxAscent;
      canvas.width = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + 32);
      canvas.height = Math.ceil(
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 32,
      );
      context.font = font;
      context.fillText(character, x, y);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const alpha = Uint8Array.from(
        { length: canvas.width * canvas.height },
        (_, index) => pixels[index * 4 + 3],
      );
      const range = document.createRange();
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const rect = range.getBoundingClientRect();
      glyphs.push({
        canvas,
        character,
        element: text.parentElement,
        color: style.color,
        alpha,
        width: canvas.width,
        height: canvas.height,
        scale,
        x: rect.left - box.left - x * scale,
        y: rect.top - box.top + (ascent - y) * scale,
        inkRight: rect.left - box.left + metrics.actualBoundingBoxRight * scale,
        inkTop: rect.top - box.top + (ascent - metrics.actualBoundingBoxAscent) * scale,
        inkHeight: (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * scale,
      });
    }
  }
  const batches = new Map();
  for (const glyph of glyphs) {
    if (!batches.has(glyph.color)) batches.set(glyph.color, []);
    batches.get(glyph.color).push(glyph);
  }
  // Union touching letters before extrusion: hidden side walls must not cut
  // through a neighboring face or produce coplanar seams in the wordmark.
  const meshes = [...batches.values()].map((batch) => {
    const scale = Math.min(...batch.map((glyph) => glyph.scale));
    const left = Math.min(...batch.map((glyph) => glyph.x)),
      top = Math.min(...batch.map((glyph) => glyph.y));
    const right = Math.max(...batch.map((glyph) => glyph.x + glyph.width * glyph.scale));
    const bottom = Math.max(...batch.map((glyph) => glyph.y + glyph.height * glyph.scale));
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((right - left) / scale);
    canvas.height = Math.ceil((bottom - top) / scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Font union unavailable");
    for (const glyph of batch)
      context.drawImage(
        glyph.canvas,
        (glyph.x - left) / scale,
        (glyph.y - top) / scale,
        (glyph.width * glyph.scale) / scale,
        (glyph.height * glyph.scale) / scale,
      );
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return {
      ...batch[0],
      x: left,
      y: top,
      scale,
      width: canvas.width,
      height: canvas.height,
      alpha: Uint8Array.from({ length: canvas.width * canvas.height }, (_, i) => pixels[i * 4 + 3]),
    };
  });
  return { box, glyphs, meshes };
}

/** Shared depth-tested solid wordmark and native hover garden. Native HTML is
 * kept in place for semantics, layout, links and every rendering fallback. */
export async function mountLogoDepth({ beforeEnter = () => {}, signal } = {}) {
  const mark = document.querySelector(".brand-mark"),
    brand = mark?.closest(".brand");
  const motion = matchMedia("(prefers-reduced-motion: reduce)"),
    contrast = matchMedia("(forced-colors: active)");
  if (!mark || motion.matches || contrast.matches || signal?.aborted) return null;
  await document.fonts.ready;
  if (!mark.isConnected || signal?.aborted) return null;
  let raster;
  try {
    raster = glyphRasters(mark);
  } catch {
    return null;
  }
  const [THREE, { createDepthInk }] = await Promise.all([
    import("three"),
    import("./growth-depth.js"),
  ]);
  if (!mark.isConnected || signal?.aborted) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  let recover = () => {
    renderer.domElement.remove();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  try {
    const controller = new AbortController(),
      options = { signal: controller.signal };
    const canvas = renderer.domElement;
    canvas.dataset.logoDepth = "solid";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "4",
      display: "none",
    });
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, 3, Math.sqrt(8000000 / (innerWidth * innerHeight))),
    );
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setClearColor(0, 0);
    document.body.append(canvas);
    const scene = new THREE.Scene(),
      group = new THREE.Group();
    scene.add(group);
    const distance = 1600;
    const camera = new THREE.PerspectiveCamera(
      (2 * Math.atan(innerHeight / (2 * distance)) * 180) / Math.PI,
      innerWidth / innerHeight,
      0.1,
      4000,
    );
    camera.position.set(innerWidth / 2, -innerHeight / 2, distance);
    camera.lookAt(innerWidth / 2, -innerHeight / 2, 0);
    const box = raster.box,
      depth = Math.max(4, Math.min(18, parseFloat(getComputedStyle(mark).fontSize) * 0.045));
    canvas.dataset.depth = String(depth);
    let restY = -box.top - box.height / 2;
    group.position.set(box.left + box.width / 2, restY, 0);
    group.rotation.set(-0.065, -0.134, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.copy(group.position).add(new THREE.Vector3(-400, 600, 1000));
    light.target.position.copy(group.position);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 512);
    Object.assign(light.shadow.camera, {
      left: -box.width / 2 - 32,
      right: box.width / 2 + 32,
      top: box.height / 2 + 96,
      bottom: -box.height / 2 - 96,
      near: 1,
      far: 2500,
    });
    light.shadow.radius = 3.5;
    light.shadow.bias = -0.0001;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    scene.add(light, light.target);
    const materials = [],
      geometries = [],
      colors = [];
    let holeCount = 0;
    for (const glyph of raster.meshes) {
      const loops = alphaContours(glyph.alpha, glyph.width, glyph.height)
        .map((points) => ({
          points,
          area: Math.abs(THREE.ShapeUtils.area(points.map((p) => new THREE.Vector2(...p)))),
        }))
        .sort((a, b) => b.area - a.area);
      const shapes = [];
      for (let i = 0; i < loops.length; i++) {
        const loop = loops[i];
        loop.parent = loops
          .slice(0, i)
          .reverse()
          .find((candidate) => inside(loop.points[0], candidate.points));
        loop.level = loop.parent ? loop.parent.level + 1 : 0;
        const points = loop.points.map(
          ([x, y]) =>
            new THREE.Vector2(
              glyph.x + x * glyph.scale - box.width / 2,
              box.height / 2 - glyph.y - y * glyph.scale,
            ),
        );
        if (loop.level % 2 === 0) {
          loop.shape = new THREE.Shape(points);
          shapes.push(loop.shape);
        } else {
          let parent = loop.parent;
          while (parent.level % 2) parent = parent.parent;
          parent.shape.holes.push(new THREE.Path(points));
          holeCount++;
        }
      }
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: Math.min(0.8, depth * 0.08),
        bevelThickness: Math.min(0.8, depth * 0.08),
      });
      geometry.translate(0, 0, -depth);
      const front = new THREE.MeshBasicMaterial({ color: glyph.color });
      const side = new THREE.MeshLambertMaterial({
        color: new THREE.Color(glyph.color).multiplyScalar(0.7),
      });
      const mesh = new THREE.Mesh(geometry, [front, side]);
      mesh.castShadow = true;
      group.add(mesh);
      geometries.push(geometry);
      materials.push(front, side);
      colors.push({ glyph, front, side });
    }
    const receiverGeometry = new THREE.PlaneGeometry(box.width + 40, box.height + 40);
    const receiverMaterial = new THREE.ShadowMaterial({ opacity: 0.12, depthWrite: false });
    const receiver = new THREE.Mesh(receiverGeometry, receiverMaterial);
    receiver.position.z = -depth - 1.5;
    receiver.receiveShadow = true;
    group.add(receiver);
    geometries.push(receiverGeometry);
    materials.push(receiverMaterial);
    const host = raster.glyphs.findLast((glyph) => glyph.character === "h");
    const unit = 72 / 128,
      origin = host
        ? [host.inkRight + 8, host.inkTop + host.inkHeight * 0.62]
        : [box.width, box.height / 2];
    const fields = new Map();
    const sample = (x, y) => {
      let nearest;
      for (const glyph of raster.glyphs) {
        if (
          x < glyph.x - 24 ||
          x > glyph.x + glyph.width * glyph.scale + 24 ||
          y < glyph.y - 24 ||
          y > glyph.y + glyph.height * glyph.scale + 24
        )
          continue;
        if (!fields.has(glyph)) fields.set(glyph, inkField(glyph.alpha, glyph.width, glyph.height));
        const hit = fields.get(glyph)((x - glyph.x) / glyph.scale, (y - glyph.y) / glyph.scale);
        if (hit) {
          hit.distance *= glyph.scale;
          if (!nearest || hit.distance < nearest.distance) nearest = hit;
        }
      }
      return nearest;
    };
    let garden;
    const retiring = [];
    const inkColors = () => [
      getComputedStyle(mark).color,
      getComputedStyle(mark.querySelector('[aria-hidden="true"]')).color,
    ];
    function createGarden() {
      const preferences = getHoverPreferences(),
        id = chooseStructure(preferences.structure);
      const wrapper = new THREE.Group();
      wrapper.position.set(origin[0] - box.width / 2, box.height / 2 - origin[1], 0);
      wrapper.scale.set(unit, -unit, unit);
      group.add(wrapper);
      const [normal, accent] = inkColors();
      return {
        id,
        wrapper,
        seed: createDepthInk(wrapper, normal, accent),
        ink: createDepthInk(wrapper, normal, accent),
        growth: preferences.generation
          ? createGrowth(
              id,
              Math.floor(Math.random() * 0x100000000),
              (point, angle, maxCurves) =>
                strokePlan(
                  point,
                  angle,
                  sample,
                  depth,
                  Math.min(36, box.height * 0.18),
                  origin,
                  unit,
                  maxCurves,
                ),
              { retain: true },
            )
          : null,
        age: 0,
        phase: Math.random() * Math.PI * 2,
        grown: 0,
        cursor: 0,
        left: 0,
        tips: 0,
        contacts: 0,
      };
    }
    function clearGarden(value) {
      value.seed.dispose();
      value.ink.dispose();
      group.remove(value.wrapper);
    }
    function paintGarden(value, retention, advance = false) {
      const curves = [];
      studyFrame(
        value.id,
        value.phase + value.age,
        Math.min(1, value.age / studyDrawDuration) * retention,
        (curve) => curves.push(curve),
      );
      value.seed.setLive(curves);
      if (advance && value.growth) {
        const age = Math.max(0, value.age - studyDrawDuration);
        value.growth.advance(age - value.grown, {
          left: (box.width / 2 - group.position.x - origin[0]) / unit,
          right: (innerWidth + box.width / 2 - group.position.x - origin[0]) / unit,
          top: (restY + box.height / 2 - origin[1]) / unit,
          bottom: (innerHeight + restY + box.height / 2 - origin[1]) / unit,
        });
        value.grown = age;
        const snapshot = value.growth.geometry(value.cursor);
        value.ink.append(snapshot.curves);
        value.ink.setLive(snapshot.live);
        value.cursor = snapshot.count;
        value.tips = snapshot.tips;
        value.contacts = snapshot.contacts;
      }
      value.ink.retention(retention);
    }
    canvas.dataset.holes = String(holeCount);
    canvas.dataset.glyphs = String(raster.glyphs.length);
    canvas.dataset.growthCurves = "0";
    const opacity = mark.style.opacity;
    let raf = 0,
      disposed = false,
      active = false,
      shown = true,
      onScreen = box.bottom > 0 && box.top < innerHeight,
      floatAge = 0,
      last = 0,
      painted = -Infinity,
      focused = document.hasFocus();
    let pointer = [0, 0],
      reveal = 0;
    function wake() {
      if (
        !raf &&
        !disposed &&
        focused &&
        !document.hidden &&
        shown &&
        onScreen &&
        !document.querySelector("dialog[open]")
      ) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }
    function tick(now) {
      raf = 0;
      if (
        disposed ||
        !shown ||
        !focused ||
        document.hidden ||
        !onScreen ||
        document.querySelector("dialog[open]")
      )
        return;
      if (!mark.isConnected) {
        dispose();
        return;
      }
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      floatAge += dt;
      if (garden) garden.age += dt;
      for (const value of retiring) value.left += dt;
      for (let index = retiring.length - 1; index >= 0; index--)
        if (retiring[index].left >= 0.8) clearGarden(retiring.splice(index, 1)[0]);
      group.position.y = restY + Math.sin(floatAge * 0.7) * Math.min(1.25, box.height * 0.005);
      const targetX = -0.065 + Math.sin(floatAge * 0.43) * 0.004 - (active ? pointer[1] * 0.06 : 0),
        targetY = -0.14 + Math.cos(floatAge * 0.31) * 0.006 + (active ? pointer[0] * 0.12 : 0);
      const easing = 1 - Math.exp(-dt / 0.13);
      group.rotation.x += (targetX - group.rotation.x) * easing;
      group.rotation.y += (targetY - group.rotation.y) * easing;
      reveal = garden ? Math.min(1, garden.age / studyDrawDuration) : 0;
      if (now - painted >= 1000 / 30) {
        if (garden) paintGarden(garden, 1, true);
        for (const value of retiring) {
          const p = Math.min(1, value.left / 0.8),
            retention = 1 - p * p * (3 - 2 * p);
          paintGarden(value, retention);
          if (!garden) reveal = Math.min(1, value.age / studyDrawDuration) * retention;
        }
        canvas.dataset.growthCurves = String(garden?.cursor || 0);
        canvas.dataset.growthTips = String(garden?.tips || 0);
        canvas.dataset.growthContacts = String(garden?.contacts || 0);
        renderer.render(scene, camera);
        painted = now;
        canvas.dataset.reveal = reveal.toFixed(4);
        canvas.dataset.tilt = `${group.rotation.x.toFixed(4)},${group.rotation.y.toFixed(4)}`;
      }
      raf = requestAnimationFrame(tick);
    }
    function enter() {
      if (active || document.querySelector("dialog[open]")) return;
      beforeEnter();
      garden = createGarden();
      canvas.dataset.structure = garden.id;
      reveal = 0;
      active = shown = true;
      pointer = [0, 0];
      canvas.dataset.reveal = reveal.toFixed(4);
      mark.style.opacity = "0";
      canvas.style.display = "block";
      renderer.render(scene, camera);
      wake();
    }
    function leave() {
      if (!active) return;
      active = false;
      if (garden) retiring.push(garden);
      garden = null;
      while (retiring.length > 12) clearGarden(retiring.shift());
      wake();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      signal?.removeEventListener("abort", dispose);
      cancelAnimationFrame(raf);
      controller.abort();
      mark.style.opacity = opacity;
      canvas.remove();
      if (garden) clearGarden(garden);
      for (const value of retiring) clearGarden(value);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      light.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
    recover = dispose;
    // Capture only brand art; native click/focus behavior and other links remain intact.
    for (const type of ["pointerover", "pointerout", "focusin", "focusout"])
      document.addEventListener(
        type,
        (event) => {
          if (!brand.contains(event.target)) return;
          event.stopImmediatePropagation();
          if (type === "pointerover" || type === "focusin") enter();
          else if (!brand.contains(event.relatedTarget)) {
            if (type === "pointerout" && brand.contains(document.activeElement)) {
              pointer = [0, 0];
              return;
            }
            if (type === "focusout" && brand.matches(":hover")) return;
            leave();
          }
        },
        { ...options, capture: true },
      );
    brand.addEventListener(
      "pointermove",
      (event) => {
        const current = mark.getBoundingClientRect();
        pointer = [
          Math.max(-0.5, Math.min(0.5, (event.clientX - current.left) / current.width - 0.5)),
          Math.max(-0.5, Math.min(0.5, (event.clientY - current.top) / current.height - 0.5)),
        ];
        wake();
      },
      options,
    );
    window.addEventListener(
      "blur",
      () => {
        focused = false;
        cancelAnimationFrame(raf);
        raf = 0;
      },
      options,
    );
    window.addEventListener(
      "focus",
      () => {
        focused = true;
        wake();
      },
      options,
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else wake();
      },
      options,
    );
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener(
      "change",
      () => {
        for (const { glyph, front, side } of colors) {
          front.color.set(getComputedStyle(glyph.element).color);
          side.color.copy(front.color).multiplyScalar(0.7);
        }
        const [normal, accent] = inkColors();
        for (const value of [garden, ...retiring].filter(Boolean)) {
          value.seed.palette(normal, accent);
          value.ink.palette(normal, accent);
        }
        wake();
      },
      options,
    );
    document.addEventListener(
      "scroll",
      () => {
        const current = mark.getBoundingClientRect();
        restY = -current.top - current.height / 2;
        onScreen = current.bottom > 0 && current.top < innerHeight;
        group.position.set(current.left + current.width / 2, restY, 0);
        light.position.copy(group.position).add(new THREE.Vector3(-400, 600, 1000));
        light.target.position.copy(group.position);
        cancelAnimationFrame(raf);
        raf = 0;
        if (shown && onScreen) {
          canvas.style.display = "block";
          mark.style.opacity = "0";
          wake();
        } else if (shown) {
          canvas.style.display = "none";
          mark.style.opacity = opacity;
        }
      },
      { ...options, passive: true, capture: true },
    );
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          active = false;
          if (garden) clearGarden(garden);
          garden = null;
          for (const value of retiring.splice(0)) clearGarden(value);
          reveal = 0;
          canvas.dataset.reveal = "0.0000";
          canvas.dataset.growthCurves = "0";
          wake();
        }
      },
      options,
    );
    document.addEventListener(
      "toggle",
      (event) => {
        if (!event.target.matches?.("dialog")) return;
        if (event.target.open) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else wake();
      },
      { ...options, capture: true },
    );
    signal?.addEventListener("abort", dispose, { once: true });
    window.addEventListener("pagehide", dispose, options);
    window.addEventListener(
      "hover-preferenceschange",
      () => {
        if (active) {
          leave();
          enter();
        }
      },
      options,
    );
    document.addEventListener("site:before-swap", dispose, options);
    canvas.addEventListener("webglcontextlost", dispose, options);
    motion.addEventListener("change", dispose, options);
    contrast.addEventListener("change", dispose, options);
    canvas.dataset.reveal = "0.0000";
    if (onScreen) {
      mark.style.opacity = "0";
      canvas.style.display = "block";
      renderer.render(scene, camera);
      wake();
    }
    if (brand.matches(":hover") || brand.contains(document.activeElement)) enter();
    return { canvas, enter, leave, dispose };
  } catch (error) {
    recover();
    throw error;
  }
}

/** One persistent owner, independent of page swaps and in-flight font loading. */
export function watchLogoDepth({ beforeEnter = () => {} } = {}) {
  let current, resize;
  const stop = () => {
    current?.abort();
    current = null;
  };
  const refresh = () => {
    stop();
    if (
      document.body.hasAttribute("data-demolishing") ||
      document.documentElement.hasAttribute("data-soft-navigation")
    )
      return;
    const controller = (current = new AbortController());
    mountLogoDepth({ beforeEnter, signal: controller.signal }).catch((error) => {
      if (!controller.signal.aborted)
        console.warn("3D logo unavailable; using native wordmark", error);
    });
  };
  document.addEventListener("site:before-swap", stop);
  document.addEventListener("site:navigation", refresh);
  document.addEventListener("site:before-capture", stop, { capture: true });
  // Also covers a cold import that finishes after navigation already started.
  new MutationObserver(() => {
    if (document.documentElement.hasAttribute("data-soft-navigation")) stop();
    else refresh();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-soft-navigation"],
  });
  new MutationObserver(() => {
    if (document.body.hasAttribute("data-demolishing")) stop();
    else refresh();
  }).observe(document.body, { attributes: true, attributeFilter: ["data-demolishing"] });
  window.addEventListener("resize", () => {
    stop();
    clearTimeout(resize);
    resize = setTimeout(refresh, 120);
  });
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refresh();
  });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", refresh);
  matchMedia("(forced-colors: active)").addEventListener("change", refresh);
  refresh();
}
