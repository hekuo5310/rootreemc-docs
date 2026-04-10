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
    i18n: {
      enabled: true,
      endpoint: "https://deepl.io.hk.cn/translate",
      sourceLang: "zh",
      defaultLang: "zh",
      altCount: 2,
      cache: true,
      autoApplySaved: true,
      languages: [
        { code: "zh", label: "简体中文" },
        { code: "en", label: "English" }
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
  assert.match(html, /data-i18n-switcher/);
  assert.match(html, /id="i18n-config"/);
  assert.match(html, /"endpoint":"https:\/\/deepl\.io\.hk\.cn\/translate"/);
});

test("renderPage should fallback to default header background", () => {
  const html = renderPage({
    siteName: "Rootree 文档",
    siteDescription: "desc",
    header: {
      background: "unknown"
    },
    i18n: {
      enabled: false
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
  assert.doesNotMatch(html, /data-i18n-switcher/);
});
