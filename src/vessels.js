import { onPage } from "./page-lifecycle.js";
import {
  defaults,
  renderers,
  readout,
  GUARD_LOOP,
  MOTION_START,
  MOTION_END,
  pointerValue,
} from "./vessels-figures.js";

const LOOPING = new Set(["circuit", "radius", "viscosity", "capillary"]);
const SETTLE_SECONDS = 2.4;
const FRAME_MS = 1000 / 30;
const STATIC_TIME = 1.6;

const outputs = {
  radius: (v) => `${Math.round(v * 100)}%`,
  rbc: (v) => `${v.toFixed(2)} M/µL`,
  mcv: (v) => `${Math.round(v)} fL`,
  mch: (v) => `${v.toFixed(1)} pg`,
  po2: (v) => `${Math.round(v)} mmHg`,
  hb: (v) => `${v.toFixed(1)} g/dL`,
  hct: (v) => `${Math.round(v * 100)}%`,
  diameter: (v) => `${v >= 100 ? Math.round(v / 10) * 10 : Math.round(v)} µm`,
  oncotic: (v) => `${Math.round(v)} mmHg`,
  arterial: (v) => `${Math.round(v)} mmHg`,
  time: (v) => `${v.toFixed(1)} s`,
};

/** Map between an input's raw value and the model value it controls. */
function reader(input) {
  const log = input.dataset.vxLog?.split(",").map(Number);
  const scale = Number(input.dataset.vxScale || 1);
  const max = Number(input.max);
  return {
    toState(raw) {
      if (log) return log[0] * (log[1] / log[0]) ** (raw / max);
      return raw * scale;
    },
    toInput(value) {
      if (log) return (max * Math.log(value / log[0])) / Math.log(log[1] / log[0]);
      return value / scale;
    },
  };
}

onPage("[data-vessels]", (root, { on, dispose }) => {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = 0;
  let pageVisible = document.visibilityState === "visible";

  const figures = [...root.querySelectorAll("[data-vx-figure]")].map((element) => {
    const kind = element.dataset.vxFigure;
    const figure = {
      kind,
      element,
      plot: element.querySelector("[data-vx-plot]"),
      text: element.querySelector("[data-vx-readout]"),
      controls: element.querySelector("[data-vx-controls]"),
      state: { ...defaults[kind] },
      width: 0,
      time: STATIC_TIME,
      visible: false,
      playing: false,
      started: false,
      motionLayer: null,
      lastReadout: "",
    };
    figure.controls.hidden = false;
    if (kind === "tube") figure.state.settle = 1;
    return figure;
  });

  function paint(figure) {
    if (!figure.width) return;
    const time = figure.kind === "guards" ? undefined : figure.time;
    const state = figure.kind === "guards" ? { time: figure.state.time } : figure.state;
    figure.plot.innerHTML = renderers[figure.kind](state, figure.width, time);
    figure.motionLayer = figure.plot.querySelector("[data-vx-motion]");
    const html = readout(figure.kind, figure.state);
    if (html !== figure.lastReadout) {
      figure.text.innerHTML = html;
      figure.lastReadout = html;
    }
  }

  function paintMotion(figure) {
    if (!figure.motionLayer?.isConnected) return paint(figure);
    const state = figure.kind === "guards" ? { time: figure.state.time } : figure.state;
    const markup = renderers[figure.kind](state, figure.width, figure.time);
    const start = markup.indexOf(MOTION_START);
    const end = markup.indexOf(MOTION_END, start);
    if (start < 0 || end < 0) return paint(figure);
    figure.motionLayer.innerHTML = markup.slice(start + MOTION_START.length, end);
  }

  function syncInputs(figure) {
    for (const input of figure.element.querySelectorAll("[data-vx-key]")) {
      const key = input.dataset.vxKey;
      const value = figure.state[key];
      if (input.type === "radio") input.checked = input.value === value;
      else if (input.type === "checkbox") input.checked = Boolean(value);
      else {
        const raw = reader(input).toInput(value);
        if (Math.abs(Number(input.value) - raw) > Number(input.step || 1) / 2)
          input.value = String(raw);
        const output = figure.element.querySelector(`[data-vx-output="${key}"]`);
        if (output) output.textContent = outputs[key]?.(value) ?? String(value);
        input.setAttribute("aria-valuetext", output?.textContent || String(value));
      }
    }
  }

  function update(figure, changes) {
    Object.assign(figure.state, changes);
    if (figure.kind === "guards" && "time" in changes) setPlaying(figure, false);
    syncInputs(figure);
    paint(figure);
  }

  function setPlaying(figure, playing) {
    figure.playing = playing && !motion.matches;
    const toggle = figure.element.querySelector("[data-vx-play]");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(figure.playing));
      toggle.textContent = figure.playing ? "pause" : "play";
    }
    schedule();
  }

  for (const figure of figures) {
    syncInputs(figure);
    on(figure.controls, "input", (event) => {
      const input = event.target.closest("[data-vx-key]");
      if (!input) return;
      const key = input.dataset.vxKey;
      let value;
      if (input.type === "checkbox") value = input.checked;
      else if (input.type === "radio") value = input.value;
      else value = reader(input).toState(Number(input.value));
      update(figure, { [key]: value });
    });
    on(figure.controls, "click", (event) => {
      const preset = event.target.closest("[data-vx-set]");
      if (preset) update(figure, JSON.parse(preset.dataset.vxSet));
      if (event.target.closest("[data-vx-replay]")) {
        figure.state.settle = 0;
        figure.started = true;
        if (motion.matches) figure.state.settle = 1;
        paint(figure);
        schedule();
      }
      if (event.target.closest("[data-vx-play]")) {
        if (!figure.playing && figure.state.time >= GUARD_LOOP - 0.05) figure.state.time = 0;
        setPlaying(figure, !figure.playing);
      }
    });
    const map = (width, x, y) => pointerValue(figure.kind, width, x, y);
    on(figure.plot, "click", (event) => {
      const level = event.target.closest?.("[data-vx-level]");
      if (level) update(figure, { level: level.dataset.vxLevel });
    });
    on(figure.plot, "pointerdown", (event) => {
      const point = () => {
        const rect = figure.plot.getBoundingClientRect();
        const svg = figure.plot.querySelector("svg");
        const scale = svg ? figure.width / svg.getBoundingClientRect().width : 1;
        return [(event.clientX - rect.left) * scale, (event.clientY - rect.top) * scale];
      };
      const first = map(figure.width, ...point());
      if (!first) return;
      event.preventDefault();
      figure.plot.setPointerCapture(event.pointerId);
      update(figure, first);
      const move = (next) => {
        event = next;
        const changes = map(figure.width, ...point());
        if (changes) update(figure, changes);
      };
      const stop = () => {
        figure.plot.removeEventListener("pointermove", move);
        figure.plot.removeEventListener("pointerup", stop);
        figure.plot.removeEventListener("pointercancel", stop);
      };
      figure.plot.addEventListener("pointermove", move);
      figure.plot.addEventListener("pointerup", stop);
      figure.plot.addEventListener("pointercancel", stop);
    });
  }

  const sizes = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const figure = figures.find(({ plot }) => plot === entry.target);
      const width = Math.floor(entry.contentRect.width);
      if (figure && width > 0 && width !== figure.width) {
        figure.width = width;
        paint(figure);
      }
    }
  });
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const figure = figures.find(({ element }) => element === entry.target);
        if (!figure) continue;
        figure.visible = entry.isIntersecting;
        if (figure.visible && !figure.started && !motion.matches) {
          figure.started = true;
          if (figure.kind === "tube") figure.state.settle = 0;
          if (figure.kind === "guards") {
            figure.state.time = 0;
            setPlaying(figure, true);
          }
          paint(figure);
        }
      }
      schedule();
    },
    { rootMargin: "80px 0px" },
  );
  for (const figure of figures) {
    sizes.observe(figure.plot);
    visibility.observe(figure.element);
  }

  function animating(figure) {
    if (!figure.visible || motion.matches || !pageVisible) return false;
    if (LOOPING.has(figure.kind)) return true;
    if (figure.kind === "tube") return figure.state.settle < 1;
    if (figure.kind === "guards") return figure.playing;
    return false;
  }

  function tick(now) {
    frame = 0;
    const active = figures.filter(animating);
    if (!active.length) {
      last = 0;
      return;
    }
    if (last && now - last < FRAME_MS) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    for (const figure of active) {
      if (figure.kind === "tube") {
        figure.state.settle = Math.min(1, figure.state.settle + dt / SETTLE_SECONDS);
        paint(figure);
      } else if (figure.kind === "guards") {
        figure.state.time = (figure.state.time + dt) % GUARD_LOOP;
        const input = figure.element.querySelector('[data-vx-key="time"]');
        const label = outputs.time(figure.state.time);
        input.value = figure.state.time.toFixed(1);
        input.setAttribute("aria-valuetext", label);
        figure.element.querySelector('[data-vx-output="time"]').textContent = label;
        // A new stage repaints fully, updating the figure's accessible label and readout.
        if (readout("guards", figure.state) !== figure.lastReadout) paint(figure);
        else paintMotion(figure);
      } else {
        figure.time += dt;
        paintMotion(figure);
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!frame && figures.some(animating)) frame = requestAnimationFrame(tick);
  }

  function reduce() {
    if (!motion.matches) return schedule();
    for (const figure of figures) {
      figure.playing = false;
      if (figure.kind === "tube") figure.state.settle = 1;
      setPlaying(figure, false);
      paint(figure);
    }
  }
  on(motion, "change", reduce);
  on(document, "visibilitychange", () => {
    pageVisible = document.visibilityState === "visible";
    last = 0;
    schedule();
  });
  reduce();

  dispose(() => {
    cancelAnimationFrame(frame);
    sizes.disconnect();
    visibility.disconnect();
  });
});
