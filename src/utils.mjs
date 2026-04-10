import path from "node:path";

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function stripExtension(filePath) {
  return filePath.replace(/\.[^/.]+$/u, "");
}

export function titleFromSegment(segment) {
  const cleaned = segment
    .replace(/\.[^/.]+$/u, "")
    .replace(/[-_]+/gu, " ")
    .trim();
  if (!cleaned) return "Untitled";

  return cleaned.replace(/\b[a-z]/gu, (letter) => letter.toUpperCase());
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

export function ensureDirPath(pathname) {
  return pathname.replace(/\\/gu, "/");
}

export function numericOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function compareByOrderThenTitle(a, b) {
  const orderDiff = numericOrder(a.order) - numericOrder(b.order);
  if (orderDiff !== 0) return orderDiff;

  return String(a.title).localeCompare(String(b.title), "zh-Hans-CN");
}

