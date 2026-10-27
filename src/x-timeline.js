export async function loadTimeline(section) {
  const target = document.createElement("div");
  section.querySelector("[data-timeline-content]").append(target);
  let script;
  let timeout;
  try {
    await Promise.race([
      (async () => {
        if (!window.twttr?.widgets?.createTimeline) {
          await new Promise((resolve, reject) => {
            script = document.createElement("script");
            script.src = "https://platform.twitter.com/widgets.js";
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error("X widgets unavailable"));
            document.head.append(script);
          });
        }
        const frame = await window.twttr.widgets.createTimeline(
          { sourceType: "profile", screenName: "devth" },
          target,
          {
            dnt: true,
            theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
            height: 600,
          },
        );
        if (!frame) throw new Error("X timeline unavailable");
      })(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("X timeline timed out")), 15_000);
      }),
    ]);
  } catch (error) {
    target.remove();
    script?.remove();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
