const namespace = "http://www.w3.org/1999/xhtml";
const blocked = new Set([
  "script",
  "style",
  "link",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "source",
]);
const loading = new Set([
  "src",
  "srcset",
  "href",
  "xlink:href",
  "poster",
  "data",
  "imagesrcset",
  "action",
  "formaction",
  "id",
  "for",
  "autofocus",
  "style",
]);

/** Copy painted content without re-requesting images (especially no-store counters).
 * Bitmaps are only drawn, never exported/read, so cross-origin images stay safe.
 */
export function capturePage() {
  const bitmaps = [];
  const proxies = new WeakMap();
  const scrolls = new WeakMap();
  let pixels = 8_000_000;
  let svgSequence = 0;
  const candidates = [
    ...document.querySelectorAll(
      [
        ".brand-mark",
        ".brand-tagline",
        ".site-header nav",
        ".header-search",
        "main .entry",
        "main .year",
        "main :is(h1,h2,h3,h4,h5,h6,p,pre,blockquote,table,figure,img,canvas,svg,button,label,select,input,li)",
        ".site-footer > p",
        ".hit-counter",
        ".site-footer > div > *",
        "dialog.quick-nav[open]",
        "body > svg:not(.geometric-cursor)",
      ].join(","),
    ),
  ].filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && style.display !== "none"
    );
  });
  const selected = new Set(candidates);
  const roots = candidates.filter((element) => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement)
      if (selected.has(parent)) return false;
    return true;
  });
  const decorative = roots.filter((element) => element.matches("body > svg,canvas"));
  const overlays = roots.filter((element) => element.matches("dialog[open]"));
  const content = roots.filter(
    (element) => !decorative.includes(element) && !overlays.includes(element),
  );
  const groups = [];
  const decorSize = Math.max(1, Math.ceil(decorative.length / 32));
  for (let index = 0; index < decorative.length; index += decorSize)
    groups.push(decorative.slice(index, index + decorSize));
  groups.push(...overlays.map((element) => [element]));
  const groupSize = Math.max(1, Math.ceil(content.length / Math.max(1, 64 - groups.length)));
  for (let index = 0; index < content.length; index += groupSize)
    groups.push(content.slice(index, index + groupSize));
  groups.sort((a, b) => roots.indexOf(a[0]) - roots.indexOf(b[0]));

  function attributes(source, target) {
    for (const { name, value } of source.attributes) {
      if (source.namespaceURI === "http://www.w3.org/2000/svg") {
        if (name === "id") {
          target.setAttribute("data-demolition-svg-id", value);
          continue;
        }
        if (name === "href" || name === "xlink:href") {
          if (value.startsWith("#")) target.setAttribute("data-demolition-svg-ref", value.slice(1));
          continue;
        }
      }
      if (
        loading.has(name) ||
        name.startsWith("on") ||
        name.startsWith("aria-") ||
        name === "tabindex" ||
        name === "role"
      )
        continue;
      if (name === "width" || name === "height") {
        if (target instanceof HTMLCanvasElement) continue;
      }
      target.setAttribute(name, value);
    }
  }
  function style(source, target) {
    const computed = getComputedStyle(source);
    const references = {};
    for (const property of computed) {
      const value = computed.getPropertyValue(property);
      target.style.setProperty(property, value.includes("url(") ? "none" : value);
      if (value.includes("url(")) {
        const reference = value.match(/#([\w:-]+)/);
        if (reference) references[property] = reference[1];
      }
    }
    if (Object.keys(references).length)
      target.setAttribute("data-demolition-svg-styles", JSON.stringify(references));
    target.style.transition = "none";
    target.style.animation = "none";
    target.style.pointerEvents = "none";
    target.style.caretColor = "transparent";
  }
  function snapshot(source, modelRect) {
    if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent);
    if (!(source instanceof Element) || blocked.has(source.localName)) return null;
    if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
      const rect = source.getBoundingClientRect();
      const proxy = document.createElement("span");
      attributes(source, proxy);
      style(source, proxy);
      proxy.style.position = "relative";
      if (proxy.style.display === "inline") proxy.style.display = "inline-block";
      proxy.style.overflow = "hidden";
      const bitmap = document.createElement("canvas");
      const ratio = Math.min(
        1,
        Math.sqrt(Math.max(1, pixels) / Math.max(1, rect.width * rect.height)),
      );
      bitmap.width = Math.max(1, Math.floor(rect.width * ratio));
      bitmap.height = Math.max(1, Math.floor(rect.height * ratio));
      pixels = Math.max(0, pixels - bitmap.width * bitmap.height);
      try {
        source.dispatchEvent(new Event("site:before-capture"));
        bitmap.getContext("2d").drawImage(source, 0, 0, bitmap.width, bitmap.height);
      } catch {
        /* A not-yet-decoded image had no pixels to copy. */
      }
      bitmaps.push(bitmap);
      proxies.set(proxy, {
        bitmap,
        width: rect.width,
        height: rect.height,
        x: rect.left - modelRect.left,
        y: rect.top - modelRect.top,
      });
      return proxy;
    }
    const copy = document.createElementNS(source.namespaceURI || namespace, source.localName);
    attributes(source, copy);
    if (copy.style) style(source, copy);
    for (const child of source.childNodes) {
      const next = snapshot(child, modelRect);
      if (next) copy.append(next);
    }
    if (source instanceof HTMLInputElement) {
      copy.value = source.value;
      copy.checked = source.checked;
    }
    if (source instanceof HTMLSelectElement || source instanceof HTMLTextAreaElement)
      copy.value = source.value;
    if (source.scrollTop || source.scrollLeft)
      scrolls.set(copy, [source.scrollLeft, source.scrollTop]);
    return copy;
  }
  function clone(source, region) {
    if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent);
    const copy = source.cloneNode(false);
    const bitmap = proxies.get(source);
    if (bitmap) {
      const left = Math.max(0, region.x - bitmap.x),
        top = Math.max(0, region.y - bitmap.y);
      const right = Math.min(bitmap.width, region.x + region.width - bitmap.x),
        bottom = Math.min(bitmap.height, region.y + region.height - bitmap.y);
      if (right > left && bottom > top) {
        const canvas = document.createElement("canvas");
        const sx = bitmap.bitmap.width / Math.max(1, bitmap.width),
          sy = bitmap.bitmap.height / Math.max(1, bitmap.height);
        canvas.width = Math.max(1, Math.ceil((right - left) * sx));
        canvas.height = Math.max(1, Math.ceil((bottom - top) * sy));
        canvas.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px;pointer-events:none`;
        canvas
          .getContext("2d")
          .drawImage(
            bitmap.bitmap,
            left * sx,
            top * sy,
            (right - left) * sx,
            (bottom - top) * sy,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        copy.append(canvas);
      }
    } else for (const child of source.childNodes) copy.append(clone(child, region));
    if (source instanceof HTMLInputElement) {
      copy.value = source.value;
      copy.checked = source.checked;
    }
    if (source instanceof HTMLSelectElement || source instanceof HTMLTextAreaElement)
      copy.value = source.value;
    const scroll = scrolls.get(source);
    if (scroll) copy.dataset.demolitionScroll = JSON.stringify(scroll);
    return copy;
  }
  function visibleWithin(element, root) {
    for (let current = element; current; current = current.parentElement) {
      const css = getComputedStyle(current);
      if (css.display === "none" || css.visibility === "hidden" || Number(css.opacity) === 0)
        return false;
      if (current === root) return true;
    }
    return false;
  }
  function paintBounds(element) {
    const css = getComputedStyle(element);
    const boxes = [element.getBoundingClientRect()];
    if (css.overflowX === "visible" && css.overflowY === "visible") {
      for (const media of element.querySelectorAll("img,canvas,svg"))
        if (visibleWithin(media, element)) boxes.push(media.getBoundingClientRect());
      if (parseFloat(css.lineHeight) < parseFloat(css.fontSize)) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let text;
        while ((text = walker.nextNode()))
          if (text.textContent.trim() && visibleWithin(text.parentElement, element)) {
            const range = document.createRange();
            range.selectNodeContents(text);
            boxes.push(range.getBoundingClientRect());
          }
      }
    }
    return boxes;
  }
  const models = [];
  for (const elements of groups) {
    const rectangles = elements.map((element) => element.getBoundingClientRect());
    const paint = elements.flatMap(paintBounds).filter((box) => box.width && box.height);
    const left = Math.min(...paint.map((rect) => rect.left)),
      top = Math.min(...paint.map((rect) => rect.top));
    const right = Math.max(...paint.map((rect) => rect.right)),
      bottom = Math.max(...paint.map((rect) => rect.bottom));
    const rect = { left, top, width: right - left, height: bottom - top };
    const prototype = document.createElement("div");
    prototype.style.cssText = `position:absolute;left:0;top:0;width:${rect.width}px;height:${rect.height}px;pointer-events:none`;
    for (let item = 0; item < elements.length; item++) {
      const copy = snapshot(elements[item], rect);
      const box = rectangles[item];
      copy.style.position = "absolute";
      copy.style.left = `${box.left - left}px`;
      copy.style.top = `${box.top - top}px`;
      copy.style.margin = "0";
      copy.style.boxSizing = "border-box";
      copy.style.width = copy.style.inlineSize = `${box.width}px`;
      copy.style.height = copy.style.blockSize = `${box.height}px`;
      copy.style.minWidth =
        copy.style.minHeight =
        copy.style.minInlineSize =
        copy.style.minBlockSize =
          "0";
      copy.style.maxWidth =
        copy.style.maxHeight =
        copy.style.maxInlineSize =
        copy.style.maxBlockSize =
          "none";
      copy.style.transform = "none";
      prototype.append(copy);
    }
    models.push({
      rect,
      decorative: elements.every((element) => element.matches("body > svg,canvas")),
      front: elements.some((element) => element.matches("dialog[open]")),
      render(region) {
        const element = document.createElement("div");
        element.className = "demolition-piece";
        element.inert = true;
        element.setAttribute("aria-hidden", "true");
        element.style.width = `${region.width}px`;
        element.style.height = `${region.height}px`;
        const visual = clone(prototype, region);
        const ids = new Map();
        for (const node of visual.querySelectorAll("[data-demolition-svg-id]")) {
          const id = "demolition-svg-" + ++svgSequence;
          ids.set(node.getAttribute("data-demolition-svg-id"), id);
          node.id = id;
          node.removeAttribute("data-demolition-svg-id");
        }
        for (const node of visual.querySelectorAll("[data-demolition-svg-ref]")) {
          const id = ids.get(node.getAttribute("data-demolition-svg-ref"));
          if (id) node.setAttribute("href", "#" + id);
          node.removeAttribute("data-demolition-svg-ref");
        }
        for (const node of visual.querySelectorAll("[data-demolition-svg-styles]")) {
          const refs = JSON.parse(node.getAttribute("data-demolition-svg-styles"));
          for (const [property, reference] of Object.entries(refs))
            if (ids.has(reference))
              node.style.setProperty(property, "url(#" + ids.get(reference) + ")");
          node.removeAttribute("data-demolition-svg-styles");
        }
        visual.style.left = `${-region.x}px`;
        visual.style.top = `${-region.y}px`;
        element.append(visual);
        return element;
      },
    });
  }
  return {
    models,
    dispose() {
      for (const bitmap of bitmaps) {
        bitmap.width = bitmap.height = 0;
      }
      bitmaps.length = 0;
      models.length = 0;
    },
  };
}

export function releasePiece(element) {
  for (const canvas of element.querySelectorAll("canvas")) canvas.width = canvas.height = 0;
  element.remove();
}
