import { studies } from "./hover-studies.js";

export const storageKey = "devth:hover-preferences:v1";
const ids = studies.map(({ id }) => id);
export function normalizePreferences(value) {
  return {
    structure: ids.includes(value?.structure) ? value.structure : "random",
    generation: typeof value?.generation === "boolean" ? value.generation : true,
  };
}
function read() {
  try {
    return normalizePreferences(JSON.parse(window.localStorage.getItem(storageKey)));
  } catch {
    return normalizePreferences(null);
  }
}
let current = read();
let previous;
export const getHoverPreferences = () => ({ ...current });
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("hover-preferenceschange"));
}
export function setHoverPreferences(update) {
  current = normalizePreferences({ ...current, ...update });
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    /* Memory-only when storage is unavailable. */
  }
  notify();
}
export function chooseStructure(structure = current.structure) {
  if (ids.includes(structure)) {
    previous = structure;
    return structure;
  }
  const choices = ids.filter((id) => id !== previous);
  previous = choices[Math.floor(Math.random() * choices.length)];
  return previous;
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) {
      current = read();
      notify();
    }
  });
