import { escapeHtml } from "./utils.mjs";

const SUPPORTED_HEADER_BACKGROUNDS = new Set(["solid", "transparent", "striped"]);

export function renderPage(payload) {
  const {
    siteName,
    siteDescription,
    header,
    page,
    navItems,
    sidebarGroups,
    previousPage,
    nextPage
  } = payload;
  const pageTitle = `${page.title} | ${siteName}`;
  const displayToc = page.toc.filter((item) => item.level >= 2 && item.level <= 3);
  const headerConfig = normalizeHeaderConfig(siteName, header);
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

  return `<!doctype html>
<html lang="zh-CN">
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
          ${rightButtonsHtml}
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

function normalizeHeaderBackground(background) {
  if (typeof background !== "string") return "solid";
  const normalized = background.trim().toLowerCase();
  return SUPPORTED_HEADER_BACKGROUNDS.has(normalized) ? normalized : "solid";
}

