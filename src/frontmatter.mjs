export function parseFrontmatter(rawContent) {
  const normalized = rawContent.replace(/\r\n/gu, "\n");
  if (!normalized.startsWith("---\n")) {
    return { data: {}, content: normalized };
  }

  const lines = normalized.split("\n");
  const data = {};
  let pointer = 1;

  while (pointer < lines.length) {
    const line = lines[pointer];
    if (line.trim() === "---") {
      pointer += 1;
      break;
    }

    if (line.trim()) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/u);
      if (match) {
        const [, key, value] = match;
        data[key] = parseScalar(value.trim());
      }
    }

    pointer += 1;
  }

  return {
    data,
    content: lines.slice(pointer).join("\n")
  };
}

function parseScalar(value) {
  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value === "true") return true;
  if (value === "false") return false;

  if (/^-?\d+(\.\d+)?$/u.test(value)) {
    return Number(value);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => parseScalar(part.trim()))
      .filter((part) => part !== "");
  }

  return value;
}

