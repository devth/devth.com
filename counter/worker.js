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
  const cells = [...digits]
    .map(
      (digit, index) =>
        `<g transform="translate(${index * 18} 0)"><rect x="0.5" y="0.5" width="17" height="23" rx="1" fill="#22231f" stroke="#62635b"/><path d="M1 12H17" stroke="#10110e"/><text x="9" y="17" text-anchor="middle" fill="#f4f3ec" font-family="monospace" font-size="17">${digit}</text></g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${digits.length * 18}" height="24" viewBox="0 0 ${digits.length * 18} 24"><title>${count} page views</title>${cells}</svg>`;
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
