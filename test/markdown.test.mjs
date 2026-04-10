import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown } from "../src/markdown.mjs";

test("parseMarkdown should return html with headings and toc", () => {
  const markdown = `# Title

## Section

Paragraph with **bold** and [link](./next.md) plus \`inline\`.

- one
- two`;

  const { html, toc, firstHeading } = parseMarkdown(markdown, {
    resolveLink: () => "/next/"
  });

  assert.equal(firstHeading, "Title");
  assert.equal(toc.length, 2);
  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<h2 id="section">Section<\/h2>/);
  assert.match(html, /<a href="\/next\/">link<\/a>/);
  assert.match(html, /<code>inline<\/code>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
});

test("parseMarkdown should support admonition blocks", () => {
  const markdown = `> [!WARNING]
> 这个比较并不完全公平 Pumpkin 目前的功能远少于其他服务器。`;

  const { html } = parseMarkdown(markdown);
  assert.match(html, /<aside class="admonition admonition-warning">/);
  assert.match(html, /<p class="admonition-title">警告<\/p>/);
  assert.match(html, /这个比较并不完全公平/);
});
