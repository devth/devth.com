import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { it, expect } from "vite-plus/test";

it("ships bounded static, high-contrast SVG cursors without external resources", () => {
  for (const name of ["arrow", "text", "hand"]) {
    const source = readFileSync(`public/images/cursors/${name}.svg`, "utf8");
    const svg = parseHTML(source).document.querySelector("svg");
    expect(Number(svg.getAttribute("width"))).toBeLessThanOrEqual(48);
    expect(Number(svg.getAttribute("height"))).toBe(48);
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(source).toContain('fill="#171816"');
    expect(source).toContain('stroke="#fff"');
    expect(source).not.toMatch(/<script|<animate|href=/);
  }
});

it("uses explicit semantic hotspots and visible native fallbacks without a tracker", () => {
  const css = readFileSync("src/style.css", "utf8");
  expect(css).toContain('url("/images/cursors/arrow.svg") 4 4, default');
  expect(css).toContain('url("/images/cursors/text.svg") 16 24, text');
  expect(css).toContain('url("/images/cursors/hand.svg") 18 5, pointer');
  expect(css).not.toContain("cursor: none");
  expect(readFileSync("src/main.js", "utf8")).not.toContain('import("./cursor.js")');
});
