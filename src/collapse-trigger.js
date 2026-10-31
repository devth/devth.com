export function init(clearSigil) {
  const buttons = [...document.querySelectorAll("[data-demolition-trigger]")];
  let pending;
  let error;
  function reset(abort = false) {
    if (abort) pending?.abort();
    pending = null;
    for (const button of buttons) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
  if (document.querySelector("#quick-nav")?.showModal)
    for (const button of buttons) button.hidden = false;
  document.addEventListener("site:before-swap", () => reset(true));
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" ||
      ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k")
    )
      reset(true);
  });
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-demolition-trigger]");
    if (!button) {
      reset(true);
      return;
    }
    reset(true);
    clearSigil();
    error?.remove();
    const request = (pending = new AbortController());
    for (const item of buttons) {
      item.disabled = true;
      item.setAttribute("aria-busy", "true");
    }
    try {
      const { collapse } = await import("./demolition.js");
      if (!request.signal.aborted) await collapse(button, { signal: request.signal });
    } catch {
      if (!request.signal.aborted) {
        error = document.createElement("span");
        error.className = "demolition-error";
        error.setAttribute("role", "status");
        error.textContent = "collapse unavailable. reload to try again.";
        button.after(error);
      }
    } finally {
      if (pending === request) reset();
    }
  });
}
