import { DurableObject } from "cloudflare:workers";
import pages from "./.generated-pages.json";

const allowedPages = new Set(pages);
const headers = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};

function digitsSvg(count) {
  const digits = String(count).padStart(7, "0");
  const width = digits.length * 16 + 14;
  const ticks = [...digits].map((_, index) => `M${12 + index * 16} 22v2`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" viewBox="0 0 ${width} 24"><title>${count} page views</title><style>svg{color:#22231f}.ticks{stroke:#62635b}.signal{stroke:#bd3b19}@media(prefers-color-scheme:dark){svg{color:#e8e8de}.ticks{stroke:#a4a69a}.signal{stroke:#f68765}}</style><path class="signal" d="M2 7v10" fill="none" stroke-width="1.5"/><text x="12" y="17" textLength="${digits.length * 16 - 4}" lengthAdjust="spacing" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="16" font-weight="500" font-style="normal">${digits}</text><path class="ticks" d="${ticks}" fill="none" stroke-width="1" opacity=".65"/></svg>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/counter.svg" || !allowedPages.has(url.searchParams.get("page"))) {
      return new Response("Not found", { status: 404, headers });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...headers, Allow: "GET, HEAD" },
      });
    }
    const counter = env.COUNTERS.getByName(url.searchParams.get("page"));
    const count = await counter.visit(request.method === "GET");
    return new Response(request.method === "HEAD" ? null : digitsSvg(count), {
      headers: {
        ...headers,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "X-Page-Views": String(count),
      },
    });
  },
};

export class PageCounter extends DurableObject {
  async visit(increment) {
    const count = (await this.ctx.storage.get("views")) || 0;
    if (!increment) return count;
    // Durable Object input gates serialize this read/modify/write across requests.
    await this.ctx.storage.put("views", count + 1);
    return count + 1;
  }
}
