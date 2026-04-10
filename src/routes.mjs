import path from "node:path";
import { toPosixPath } from "./utils.mjs";

export function routeFromRelativeDocPath(relativeDocPath) {
  const normalized = toPosixPath(relativeDocPath).replace(/^\.\/+/u, "");
  const withoutExt = normalized.replace(/\.md$/iu, "");

  if (withoutExt === "index") return "/";

  if (withoutExt.endsWith("/index")) {
    const parent = withoutExt.slice(0, -"index".length).replace(/\/+$/u, "");
    return `/${parent}/`;
  }

  return `/${withoutExt}/`;
}

export function outputPathFromRoute(outDir, route) {
  if (route === "/") {
    return path.join(outDir, "index.html");
  }

  const cleanRoute = route.replace(/^\/+|\/+$/gu, "");
  return path.join(outDir, cleanRoute, "index.html");
}

function looksExternalLink(link) {
  return /^(https?:|mailto:|tel:)/iu.test(link);
}

function isAnchorOnlyLink(link) {
  return link.startsWith("#");
}

function hasFileExtension(linkPath) {
  return /\.[a-z0-9]+$/iu.test(linkPath);
}

export function resolveMarkdownLink(rawLink, currentRelativeDocPath) {
  const trimmed = rawLink.trim();
  if (!trimmed || looksExternalLink(trimmed) || isAnchorOnlyLink(trimmed)) {
    return trimmed;
  }

  const [linkPath, hash = ""] = trimmed.split("#");
  const hashSuffix = hash ? `#${hash}` : "";

  if (linkPath.endsWith(".md")) {
    const currentDir = path.posix.dirname(toPosixPath(currentRelativeDocPath));
    const resolved = path.posix.normalize(path.posix.join(currentDir, linkPath));
    return `${routeFromRelativeDocPath(resolved)}${hashSuffix}`;
  }

  if (linkPath.startsWith("/")) {
    const normalized = linkPath.endsWith("/") || hasFileExtension(linkPath) ? linkPath : `${linkPath}/`;
    return `${normalized}${hashSuffix}`;
  }

  return trimmed;
}

