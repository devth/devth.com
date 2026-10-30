import { describe, it, expect } from "vitest";
import { parseHTML } from "linkedom";
import { preserveCase } from "../src/lettercase.js";

describe("lowercase presentation exceptions", () => {
  it("marks real acronyms and literals without changing authored text", () => {
    const { document } = parseHTML(
      "<html><body><h1>YAML was a bad idea for CI pipelines</h1><p>API APIs UI UX RSS MCP DNA TICK WAS A GOOD YEAR $EDITOR https://example.com/SomeCase</p><pre><code>const API = SomeFunction();</code></pre></body></html>",
    );
    const original = document.body.textContent;
    preserveCase(document.body);
    expect(document.body.textContent).toBe(original);
    expect([...document.querySelectorAll(".keep-case")].map((node) => node.textContent)).toEqual([
      "YAML",
      "CI",
      "API",
      "APIs",
      "UI",
      "UX",
      "RSS",
      "MCP",
      "DNA",
      "TICK",
      "$EDITOR",
      "https://example.com/SomeCase",
    ]);
    expect(document.querySelector("pre .keep-case")).toBeNull();
    const once = document.body.innerHTML;
    preserveCase(document.body);
    expect(document.body.innerHTML).toBe(once);
  });
});
