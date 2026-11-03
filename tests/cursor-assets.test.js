import { readFileSync } from "node:fs";
import { it, expect } from "vite-plus/test";

it("leaves cursor rendering to the browser without custom images or a tracker", () => {
  const css = readFileSync("src/style.css", "utf8");
  expect(css).not.toMatch(/--cursor-|images\/cursors\/|cursor:\s*none/);
  expect(readFileSync("src/main.js", "utf8")).not.toContain('import("./cursor.js")');
});
