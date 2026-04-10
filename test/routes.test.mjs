import test from "node:test";
import assert from "node:assert/strict";
import { resolveMarkdownLink, routeFromRelativeDocPath } from "../src/routes.mjs";

test("routeFromRelativeDocPath should convert doc path into clean route", () => {
  assert.equal(routeFromRelativeDocPath("index.md"), "/");
  assert.equal(routeFromRelativeDocPath("guide/getting-started.md"), "/guide/getting-started/");
  assert.equal(routeFromRelativeDocPath("reference/index.md"), "/reference/");
});

test("resolveMarkdownLink should resolve local markdown links", () => {
  assert.equal(
    resolveMarkdownLink("./getting-started.md", "guide/routing.md"),
    "/guide/getting-started/"
  );
  assert.equal(
    resolveMarkdownLink("../index.md#overview", "guide/routing.md"),
    "/#overview"
  );
  assert.equal(resolveMarkdownLink("https://example.com", "guide/routing.md"), "https://example.com");
});

