import { escapeHtml } from "./utils.mjs";

export function renderPage(payload) {
  const {
    siteName,
    siteDescription,
    page,
    navItems,
    sidebarGroups,
    previousPage,
    nextPage
  } = payload;
  const pageTitle = `${page.title} | ${siteName}`;
  const displayToc = page.toc.filter((item) => item.level >= 2 && item.level <= 3);

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
      <header class="topbar">
        <a class="brand" href="/">${escapeHtml(siteName)}</a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="sidebar">导航</button>
        <nav class="top-nav">${navHtml}</nav>
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

