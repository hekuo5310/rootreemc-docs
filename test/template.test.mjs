import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../src/template.mjs";

test("renderPage should render custom header settings", () => {
  const html = renderPage({
    siteName: "Rootree 文档",
    siteDescription: "desc",
    header: {
      sticky: false,
      background: "transparent",
      logo: {
        text: "Rootree",
        link: "/",
        image: "/assets/logo.png",
        alt: "Rootree Logo"
      },
      rightButtons: [
        { text: "GitHub", link: "https://example.com", newTab: true, style: "filled" }
      ]
    },
    page: {
      title: "Home",
      route: "/",
      html: "<h1>Home</h1>",
      toc: []
    },
    navItems: [{ text: "首页", link: "/" }],
    sidebarGroups: [],
    previousPage: null,
    nextPage: null
  });

  assert.match(html, /class="topbar topbar-static topbar-bg-transparent"/);
  assert.match(html, /class="brand-image"/);
  assert.match(html, /class="header-action filled"/);
  assert.match(html, /target="_blank"/);
});

test("renderPage should fallback to default header background", () => {
  const html = renderPage({
    siteName: "Rootree 文档",
    siteDescription: "desc",
    header: {
      background: "unknown"
    },
    page: {
      title: "Home",
      route: "/",
      html: "<h1>Home</h1>",
      toc: []
    },
    navItems: [],
    sidebarGroups: [],
    previousPage: null,
    nextPage: null
  });

  assert.match(html, /class="topbar topbar-sticky topbar-bg-solid"/);
});

