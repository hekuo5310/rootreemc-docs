import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseFrontmatter } from "./frontmatter.mjs";
import { parseMarkdown } from "./markdown.mjs";
import { buildNavItems, buildSidebarGroups } from "./navigation.mjs";
import { outputPathFromRoute, resolveMarkdownLink, routeFromRelativeDocPath } from "./routes.mjs";
import { ensureDirPath, numericOrder, titleFromSegment, toPosixPath } from "./utils.mjs";
import { renderPage } from "./template.mjs";

const DEFAULT_CONFIG = {
  siteName: "Rootree 文档",
  siteDescription: "极简静态文档系统",
  docsDir: "docs",
  outDir: "dist",
  base: "/",
  header: {
    sticky: true,
    background: "solid",
    logo: {
      text: "",
      link: "/",
      image: "",
      alt: ""
    },
    rightButtons: []
  },
  i18n: {
    enabled: false,
    endpoint: "/api/translate",
    sourceLang: "zh",
    defaultLang: "zh",
    altCount: 0,
    cache: true,
    autoApplySaved: true,
    languages: [
      { code: "zh", label: "简体中文" },
      { code: "en", label: "English" }
    ]
  },
  nav: []
};

export async function buildSite(rootDir) {
  const config = await loadConfig(rootDir);
  const docsDir = path.resolve(rootDir, config.docsDir);
  const outDir = path.resolve(rootDir, config.outDir);
  const publicDir = path.resolve(rootDir, "public");

  const markdownFiles = await collectMarkdownFiles(docsDir);
  if (!markdownFiles.length) {
    throw new Error(`No markdown files found in ${docsDir}`);
  }

  const documents = [];
  for (const markdownFile of markdownFiles) {
    const rawContent = await fs.readFile(markdownFile, "utf8");
    const relativePath = toPosixPath(path.relative(docsDir, markdownFile));
    const route = routeFromRelativeDocPath(relativePath);
    const { data, content } = parseFrontmatter(rawContent);
    const markdownResult = parseMarkdown(content, {
      resolveLink: (href) => resolveMarkdownLink(href, relativePath)
    });
    const title =
      (typeof data.title === "string" && data.title.trim()) ||
      markdownResult.firstHeading ||
      titleFromSegment(path.basename(relativePath, ".md"));

    documents.push({
      sourcePath: markdownFile,
      relativePath,
      route,
      title,
      order: numericOrder(data.order),
      html: markdownResult.html,
      toc: markdownResult.toc
    });
  }

  const orderedDocs = [...documents].sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;

    return a.relativePath.localeCompare(b.relativePath, "zh-Hans-CN");
  });

  const navItems = buildNavItems(config.nav, orderedDocs);
  const sidebarGroups = buildSidebarGroups(orderedDocs);
  const docIndexByRoute = new Map(orderedDocs.map((doc, index) => [doc.route, index]));

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  await copyPublicAssets(publicDir, outDir);

  for (const doc of orderedDocs) {
    const currentIndex = docIndexByRoute.get(doc.route);
    const previousPage = currentIndex > 0 ? orderedDocs[currentIndex - 1] : null;
    const nextPage = currentIndex < orderedDocs.length - 1 ? orderedDocs[currentIndex + 1] : null;
    const html = renderPage({
      siteName: config.siteName,
      siteDescription: config.siteDescription,
      header: config.header,
      i18n: config.i18n,
      page: doc,
      navItems,
      sidebarGroups,
      previousPage,
      nextPage
    });

    const outputPath = outputPathFromRoute(outDir, doc.route);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html, "utf8");
  }

  const routes = orderedDocs.map((doc) => ({
    route: doc.route,
    title: doc.title,
    source: ensureDirPath(doc.relativePath)
  }));
  await fs.writeFile(path.join(outDir, "routes.json"), `${JSON.stringify(routes, null, 2)}\n`, "utf8");

  return {
    outDir,
    pageCount: orderedDocs.length
  };
}

async function loadConfig(rootDir) {
  const configPath = path.resolve(rootDir, "docs.config.mjs");

  try {
    await fs.access(configPath);
  } catch {
    return { ...DEFAULT_CONFIG };
  }

  const stat = await fs.stat(configPath);
  const moduleUrl = `${pathToFileURL(configPath).href}?mtime=${stat.mtimeMs}`;
  const userConfig = (await import(moduleUrl)).default || {};
  const mergedHeader = {
    ...DEFAULT_CONFIG.header,
    ...(userConfig.header || {}),
    logo: {
      ...DEFAULT_CONFIG.header.logo,
      ...((userConfig.header && userConfig.header.logo) || {})
    },
    rightButtons: Array.isArray(userConfig.header?.rightButtons)
      ? userConfig.header.rightButtons
      : DEFAULT_CONFIG.header.rightButtons
  };
  const mergedI18n = {
    ...DEFAULT_CONFIG.i18n,
    ...(userConfig.i18n || {}),
    languages: Array.isArray(userConfig.i18n?.languages)
      ? userConfig.i18n.languages
      : DEFAULT_CONFIG.i18n.languages
  };

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    header: mergedHeader,
    i18n: mergedI18n
  };
}

async function collectMarkdownFiles(rootDir) {
  const found = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        found.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return found.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

async function copyPublicAssets(publicDir, outDir) {
  try {
    await fs.access(publicDir);
  } catch {
    return;
  }

  await copyDirectory(publicDir, outDir);
}

async function copyDirectory(sourceDir, targetDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyDirectory(sourcePath, targetPath);
      continue;
    }
    await fs.copyFile(sourcePath, targetPath);
  }
}
