import { escapeHtml } from "./utils.mjs";

const SUPPORTED_HEADER_BACKGROUNDS = new Set(["solid", "transparent", "striped"]);

export function renderPage(payload) {
  const {
    siteName,
    siteDescription,
    header,
    i18n,
    page,
    navItems,
    sidebarGroups,
    previousPage,
    nextPage
  } = payload;
  const pageTitle = `${page.title} | ${siteName}`;
  const displayToc = page.toc.filter((item) => item.level >= 2 && item.level <= 3);
  const headerConfig = normalizeHeaderConfig(siteName, header);
  const i18nConfig = normalizeI18nConfig(i18n);
  const topbarClassName = [
    "topbar",
    headerConfig.sticky ? "topbar-sticky" : "topbar-static",
    `topbar-bg-${headerConfig.background}`
  ].join(" ");

  const navHtml = navItems
    .map((item) => {
      const activeClass = item.link === page.route ? "nav-link active" : "nav-link";
      return `<a class="${activeClass}" href="${item.link}">${escapeHtml(item.text)}</a>`;
    })
    .join("");

  const sidebarHtml = sidebarGroups
    .map((group) => {
      const items = group.items
        .map((item) => {
          const activeClass = item.route === page.route ? "sidebar-link active" : "sidebar-link";
          return `<li><a class="${activeClass}" href="${item.route}">${escapeHtml(item.title)}</a></li>`;
        })
        .join("");
      return `<section class="sidebar-group"><h2>${escapeHtml(group.title)}</h2><ul>${items}</ul></section>`;
    })
    .join("");

  const tocHtml = displayToc.length
    ? `<ul>${displayToc
        .map(
          (item) =>
            `<li class="toc-level-${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`
        )
        .join("")}</ul>`
    : "<p class=\"toc-empty\">当前页面没有可显示的目录。</p>";

  const pagerHtml = renderPager(previousPage, nextPage);
  const brandHtml = renderBrand(headerConfig.logo, siteName);
  const rightButtonsHtml = renderRightButtons(headerConfig.rightButtons);
  const i18nControlHtml = renderI18nControl(i18nConfig);
  const headerUtilityHtml = renderHeaderUtility(i18nControlHtml, rightButtonsHtml);
  const i18nConfigScript = renderI18nConfigScript(i18nConfig);

  return `<!doctype html>
<html lang="${escapeHtml(i18nConfig.defaultLang)}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(siteDescription)}">
    <title>${escapeHtml(pageTitle)}</title>
    <link rel="stylesheet" href="/assets/style.css">
  </head>
  <body>
    <div class="app">
      <header class="${topbarClassName}">
        <a class="brand" href="${escapeHtml(headerConfig.logo.link)}">${brandHtml}</a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="sidebar">导航</button>
        <div class="topbar-right">
          <nav class="top-nav">${navHtml}</nav>
          ${headerUtilityHtml}
        </div>
      </header>

      <div class="layout">
        <aside class="sidebar" id="sidebar">${sidebarHtml}</aside>

        <main class="content">
          <article class="doc">${page.html}</article>
          ${pagerHtml}
        </main>

        <aside class="toc">
          <h2>页面目录</h2>
          ${tocHtml}
        </aside>
      </div>
    </div>
    ${i18nConfigScript}
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;
}

function renderPager(previousPage, nextPage) {
  if (!previousPage && !nextPage) return "";

  const previous = previousPage
    ? `<a class="pager-link" href="${previousPage.route}">上一页：${escapeHtml(previousPage.title)}</a>`
    : "<span></span>";
  const next = nextPage
    ? `<a class="pager-link" href="${nextPage.route}">下一页：${escapeHtml(nextPage.title)}</a>`
    : "<span></span>";

  return `<nav class="pager">${previous}${next}</nav>`;
}

function renderBrand(logo, siteName) {
  const text = logo.text || siteName;
  const imageHtml = logo.image
    ? `<span class="brand-image-wrap"><img class="brand-image" src="${escapeHtml(logo.image)}" alt="${escapeHtml(
        logo.alt || text
      )}"></span>`
    : "";
  return `${imageHtml}<span class="brand-text">${escapeHtml(text)}</span>`;
}

function renderHeaderUtility(i18nControlHtml, rightButtonsHtml) {
  const segments = [];
  if (i18nControlHtml) segments.push(i18nControlHtml);
  if (rightButtonsHtml) segments.push(rightButtonsHtml);
  if (!segments.length) return "";
  return `<div class="header-utility">${segments.join("")}</div>`;
}

function renderRightButtons(buttons) {
  const validButtons = buttons.filter((button) => button.text && button.link);
  if (!validButtons.length) return "";

  const links = validButtons
    .map((button) => {
      const className = button.style === "filled" ? "header-action filled" : "header-action";
      const target = button.newTab ? ' target="_blank" rel="noreferrer noopener"' : "";
      return `<a class="${className}" href="${escapeHtml(button.link)}"${target}>${escapeHtml(button.text)}</a>`;
    })
    .join("");

  return `<div class="header-actions">${links}</div>`;
}

function renderI18nControl(i18nConfig) {
  if (!i18nConfig.enabled || i18nConfig.languages.length < 2) return "";

  const options = i18nConfig.languages
    .map((language) => {
      const selected = language.code === i18nConfig.defaultLang ? " selected" : "";
      return `<option value="${escapeHtml(language.code)}"${selected}>${escapeHtml(language.label)}</option>`;
    })
    .join("");

  return `<label class="language-switcher" data-i18n-skip><span class="language-label">语言</span><select class="language-select" data-i18n-switcher>${options}</select></label>`;
}

function renderI18nConfigScript(i18nConfig) {
  if (!i18nConfig.enabled || i18nConfig.languages.length < 2) return "";
  const serialized = serializeJsonForHtml({
    enabled: i18nConfig.enabled,
    endpoint: i18nConfig.endpoint,
    sourceLang: i18nConfig.sourceLang,
    defaultLang: i18nConfig.defaultLang,
    altCount: i18nConfig.altCount,
    cache: i18nConfig.cache,
    autoApplySaved: i18nConfig.autoApplySaved,
    languages: i18nConfig.languages
  });
  return `<script id="i18n-config" type="application/json">${serialized}</script>`;
}

function serializeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}

function normalizeHeaderConfig(siteName, header) {
  const source = header || {};
  const sourceLogo = source.logo || {};
  const background = normalizeHeaderBackground(source.background);

  const text =
    typeof sourceLogo.text === "string" && sourceLogo.text.trim() ? sourceLogo.text.trim() : siteName;
  const link =
    typeof sourceLogo.link === "string" && sourceLogo.link.trim() ? sourceLogo.link.trim() : "/";
  const image = typeof sourceLogo.image === "string" ? sourceLogo.image.trim() : "";
  const alt = typeof sourceLogo.alt === "string" && sourceLogo.alt.trim() ? sourceLogo.alt.trim() : text;
  const rightButtons = Array.isArray(source.rightButtons)
    ? source.rightButtons.map(normalizeHeaderButton)
    : [];

  return {
    sticky: source.sticky !== false,
    background,
    logo: {
      text,
      link,
      image,
      alt
    },
    rightButtons
  };
}

function normalizeHeaderButton(button) {
  const source = button || {};
  return {
    text: typeof source.text === "string" ? source.text.trim() : "",
    link: typeof source.link === "string" ? source.link.trim() : "",
    newTab: Boolean(source.newTab),
    style: source.style === "filled" ? "filled" : "outline"
  };
}

function normalizeI18nConfig(i18n) {
  const source = i18n || {};
  const sourceLang = normalizeLanguageCode(source.sourceLang || "zh");
  const defaultLang = normalizeLanguageCode(source.defaultLang || sourceLang);
  const languages = normalizeLanguages(source.languages, sourceLang, defaultLang);

  return {
    enabled: source.enabled === true,
    endpoint:
      typeof source.endpoint === "string" && source.endpoint.trim()
        ? source.endpoint.trim()
        : "https://deepl.io.hk.cn/translate",
    sourceLang,
    defaultLang,
    altCount: normalizeAltCount(source.altCount),
    cache: source.cache !== false,
    autoApplySaved: source.autoApplySaved !== false,
    languages
  };
}

function normalizeLanguages(languages, sourceLang, defaultLang) {
  const normalizedList = Array.isArray(languages)
    ? languages
        .map((language) => {
          const code = normalizeLanguageCode(language?.code || "");
          const label =
            typeof language?.label === "string" && language.label.trim()
              ? language.label.trim()
              : code.toUpperCase();
          return { code, label };
        })
        .filter((language) => Boolean(language.code))
    : [];

  const knownCodes = new Set(normalizedList.map((language) => language.code));
  if (!knownCodes.has(sourceLang)) {
    normalizedList.unshift({ code: sourceLang, label: sourceLang.toUpperCase() });
    knownCodes.add(sourceLang);
  }
  if (!knownCodes.has(defaultLang)) {
    normalizedList.push({ code: defaultLang, label: defaultLang.toUpperCase() });
  }

  return normalizedList;
}

function normalizeLanguageCode(code) {
  if (typeof code !== "string") return "zh";
  const normalized = code.trim().toLowerCase();
  return normalized || "zh";
}

function normalizeAltCount(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 3);
}

function normalizeHeaderBackground(background) {
  if (typeof background !== "string") return "solid";
  const normalized = background.trim().toLowerCase();
  return SUPPORTED_HEADER_BACKGROUNDS.has(normalized) ? normalized : "solid";
}

