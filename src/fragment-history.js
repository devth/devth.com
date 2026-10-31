export function pushFragment(url) {
  if (!document.dispatchEvent(new Event("site:before-fragment", { cancelable: true })))
    return false;
  history.pushState({ ...history.state, devthEntry: crypto.randomUUID() }, "", url);
  document.dispatchEvent(new Event("site:fragment"));
  return true;
}
