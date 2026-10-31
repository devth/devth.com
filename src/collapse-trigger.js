export function init(clearSigil) {
  const buttons = [...document.querySelectorAll("[data-demolition-trigger]")];
  const supported = !!document.querySelector("#quick-nav")?.showModal;
  let pending;
  let hold;
  let error;
  function reset(abort = false) {
    if (abort) pending?.abort();
    pending = null;
    for (const button of buttons) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
  function releaseHold() {
    if (!hold) return;
    const released = hold;
    hold = null;
    released.abort();
    reset();
  }
  async function launch(trigger, releaseSignal) {
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
      if (!request.signal.aborted && !releaseSignal?.aborted)
        await collapse(trigger, { signal: request.signal, releaseSignal });
    } catch {
      if (!request.signal.aborted && !releaseSignal?.aborted) {
        error = document.createElement("span");
        error.className = "demolition-error";
        error.setAttribute("role", "status");
        error.textContent = "collapse unavailable. reload to try again.";
        (trigger.matches("[data-demolition-trigger]") ? trigger : buttons[0])?.after(error);
      }
    } finally {
      if (pending === request) reset();
    }
  }
  if (supported) for (const button of buttons) button.hidden = false;
  document.addEventListener("site:before-swap", () => {
    releaseHold();
    reset(true);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" ||
      ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k")
    ) {
      releaseHold();
      reset(true);
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Shift" && !event.shiftKey) releaseHold();
  });
  window.addEventListener("blur", releaseHold);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseHold();
  });
  const editing = (target) =>
    target instanceof Element &&
    target.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]',
    );
  window.addEventListener(
    "wheel",
    (event) => {
      if (!event.shiftKey) {
        releaseHold();
        return;
      }
      if (
        !supported ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !(event.deltaX || event.deltaY)
      )
        return;
      if (hold) {
        event.preventDefault();
        return;
      }
      if (
        document.querySelector("dialog[open]") ||
        editing(event.target) ||
        editing(document.activeElement)
      )
        return;
      event.preventDefault();
      hold = new AbortController();
      launch(document.activeElement || document.body, hold.signal);
    },
    { passive: false },
  );
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demolition-trigger]");
    if (!button) {
      reset(true);
      return;
    }
    launch(button);
  });
}
