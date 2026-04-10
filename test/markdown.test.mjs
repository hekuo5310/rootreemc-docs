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
