// Explicit acronyms, not arbitrary capitals such as WAS, YEAR, or HITS.
const literals =
  /\b(?:2D|3D|API|ASM|AST|AWS|BFF|CD|CDK|CDN|CEO|CI|CLI|CPU|CRA|CRUD|CSS|DNA|DR|DX|EDN|ES6|FP|GCP|HCL|HTML|HTTP|HTTPS|IC|IDE|IO|IP|IRC|IRL|JS|JSON|JVM|KV|LSP|LYAH|MA|MCP|MVP|NB|NPR|OO|OOP|OS|OSS|PDF|PR|README|REPL|RSS|RT|SDK|SQL|SRE|SSH|SVG|TCP|TICK|TL|UI|URI|URL|UX|VB|WCAG|XML|YAML)(?:s)?\b|\$[A-Z_][A-Z0-9_]*|\bhttps?:\/\/[^\s<>]+/g;

export function preserveCase(root) {
  const document = root.ownerDocument || root;
  const walker = document.createTreeWalker(root, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (
      node.parentElement?.closest(
        "head, script, style, pre, code, kbd, samp, var, svg, textarea, .keep-case",
      )
    )
      continue;
    const text = node.textContent;
    const matches = [...text.matchAll(literals)];
    if (!matches.length) continue;
    const fragment = document.createDocumentFragment();
    let start = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(text.slice(start, match.index)));
      const literal = document.createElement("span");
      literal.className = "keep-case";
      literal.textContent = match[0];
      fragment.append(literal);
      start = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(start)));
    node.replaceWith(fragment);
  }
}
