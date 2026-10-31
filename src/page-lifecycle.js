const features = new Map();
let controller = new AbortController();
function mountFeature(selector, setup) {
  const root = document.querySelector(selector);
  if (!root || controller.signal.aborted) return;
  const signal = controller.signal;
  setup(root, {
    signal,
    on(target, type, callback, options = {}) {
      target.addEventListener(type, callback, { ...options, signal });
    },
    dispose(callback) {
      signal.addEventListener("abort", callback, { once: true });
    },
  });
}
export function onPage(selector, setup) {
  if (features.has(selector)) return;
  features.set(selector, setup);
  mountFeature(selector, setup);
}
export function unmountPage() {
  controller.abort();
}
export function mountPage() {
  controller = new AbortController();
  for (const [selector, setup] of features) mountFeature(selector, setup);
}
