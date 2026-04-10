import { escapeHtml } from "./utils.mjs";

export function slugify(value) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
  return base || "section";
}

export function parseMarkdown(markdown, options = {}) {
  const resolveLink = options.resolveLink || ((href) => href);
  const lines = markdown.replace(/\r\n/gu, "\n").split("\n");
  const htmlParts = [];
  const toc = [];
  const slugCount = new Map();
  const paragraphBuffer = [];
  const quoteBuffer = [];
  let listState = null;
  let codeBlock = null;
  let firstHeading = "";

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    htmlParts.push(`<p>${parseInline(paragraphBuffer.join(" "), resolveLink)}</p>`);
    paragraphBuffer.length = 0;
  }

  function flushList() {
    if (!listState) return;
    const tag = listState.type === "ordered" ? "ol" : "ul";
    const items = listState.items
      .map((item) => `<li>${parseInline(item, resolveLink)}</li>`)
      .join("");
    htmlParts.push(`<${tag}>${items}</${tag}>`);
    listState = null;
  }

  function flushQuote() {
    if (!quoteBuffer.length) return;
    const firstLine = quoteBuffer[0].trim();
    const alertMatch = firstLine.match(/^\[!([a-z]+)\](?:\s+(.+))?$/iu);

    if (alertMatch) {
      const alertType = alertMatch[1].toLowerCase();
      const explicitTitle = alertMatch[2]?.trim() || "";
      const title = explicitTitle || alertTitleByType(alertType);
      const bodyText = quoteBuffer.slice(1).join(" ").trim();
      const bodyHtml = bodyText ? `<p>${parseInline(bodyText, resolveLink)}</p>` : "";
      htmlParts.push(
        `<aside class="admonition admonition-${escapeHtml(alertType)}"><p class="admonition-title">${parseInline(
          title,
          resolveLink
        )}</p>${bodyHtml}</aside>`
      );
      quoteBuffer.length = 0;
      return;
    }

    const quote = parseInline(quoteBuffer.join(" "), resolveLink);
    htmlParts.push(`<blockquote><p>${quote}</p></blockquote>`);
    quoteBuffer.length = 0;
  }

  function flushCodeBlock() {
    if (!codeBlock) return;
    const languageClass = codeBlock.language ? ` class="language-${escapeHtml(codeBlock.language)}"` : "";
    const code = escapeHtml(codeBlock.lines.join("\n"));
    htmlParts.push(`<pre><code${languageClass}>${code}</code></pre>`);
    codeBlock = null;
  }

  function createHeadingId(rawText) {
    const plain = stripInlineSyntax(rawText);
    const base = slugify(plain);
    const existing = slugCount.get(base) || 0;
    const next = existing + 1;
    slugCount.set(base, next);
    return existing === 0 ? base : `${base}-${next}`;
  }

  for (const line of lines) {
    if (codeBlock) {
      if (/^```/u.test(line.trim())) {
        flushCodeBlock();
      } else {
        codeBlock.lines.push(line);
      }
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const fenceMatch = trimmed.match(/^```([a-zA-Z0-9_-]+)?$/u);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      codeBlock = {
        language: fenceMatch[1] || "",
        lines: []
      };
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/u);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = headingMatch[1].length;
      const rawText = headingMatch[2].trim();
      const text = stripInlineSyntax(rawText);
      const id = createHeadingId(rawText);
      if (!firstHeading) firstHeading = text;
      toc.push({ id, text, level });
      htmlParts.push(`<h${level} id="${id}">${parseInline(rawText, resolveLink)}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/u.test(trimmed)) {
      flushParagraph();
      flushList();
      flushQuote();
      htmlParts.push("<hr>");
      continue;
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/u);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteBuffer.push(quoteMatch[1]);
      continue;
    }

    const orderedItemMatch = line.match(/^\s*\d+\.\s+(.+)$/u);
    if (orderedItemMatch) {
      flushParagraph();
      flushQuote();
      if (!listState || listState.type !== "ordered") {
        flushList();
        listState = { type: "ordered", items: [] };
      }
      listState.items.push(orderedItemMatch[1].trim());
      continue;
    }

    const unorderedItemMatch = line.match(/^\s*[-*+]\s+(.+)$/u);
    if (unorderedItemMatch) {
      flushParagraph();
      flushQuote();
      if (!listState || listState.type !== "unordered") {
        flushList();
        listState = { type: "unordered", items: [] };
      }
      listState.items.push(unorderedItemMatch[1].trim());
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCodeBlock();

  return {
    html: htmlParts.join("\n"),
    toc,
    firstHeading
  };
}

function stripInlineSyntax(text) {
  return text
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/\*([^*]+)\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1")
    .replace(/_([^_]+)_/gu, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, "$1")
    .trim();
}

function parseInline(text, resolveLink) {
  const codeTokens = [];
  let parsed = text.replace(/`([^`]+)`/gu, (_, code) => {
    const token = `%%CODETOKEN${codeTokens.length}%%`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  parsed = escapeHtml(parsed);

  parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/gu, (_, label, href) => {
    const link = escapeHtml(resolveLink(href));
    return `<a href="${link}">${label}</a>`;
  });

  parsed = parsed.replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>");
  parsed = parsed.replace(/__([^_]+)__/gu, "<strong>$1</strong>");
  parsed = parsed.replace(/(^|[^*])\*([^*]+)\*/gu, "$1<em>$2</em>");
  parsed = parsed.replace(/(^|[^_])_([^_]+)_/gu, "$1<em>$2</em>");

  parsed = parsed.replace(/%%CODETOKEN(\d+)%%/gu, (_, index) => codeTokens[Number(index)] || "");

  return parsed;
}

function alertTitleByType(type) {
  const key = String(type).toLowerCase();
  if (key === "note") return "提示";
  if (key === "tip") return "技巧";
  if (key === "important") return "重要";
  if (key === "warning") return "警告";
  if (key === "caution") return "注意";
  return key.toUpperCase();
}
