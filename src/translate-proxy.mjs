export const DEFAULT_UPSTREAM_TRANSLATE_ENDPOINT = "https://deepl.io.hk.cn/translate";

export function normalizeTranslateRequest(rawBody) {
  const source = rawBody && typeof rawBody === "object" ? rawBody : {};
  const text = typeof source.text === "string" ? source.text : "";
  const targetLang = typeof source.target_lang === "string" ? source.target_lang : "";
  const sourceLang = typeof source.source_lang === "string" ? source.source_lang : "";
  const altCount = normalizeAltCount(source.alt_count);

  return {
    text: text.trim(),
    source_lang: sourceLang.trim().toLowerCase(),
    target_lang: targetLang.trim().toLowerCase(),
    alt_count: altCount
  };
}

export async function proxyTranslateRequest(rawBody, options = {}) {
  const endpoint = options.endpoint || DEFAULT_UPSTREAM_TRANSLATE_ENDPOINT;
  const fetchImpl = options.fetchImpl || fetch;
  const requestBody = normalizeTranslateRequest(rawBody);
  const errors = validateTranslateRequest(requestBody);
  if (errors.length > 0) {
    return {
      status: 400,
      payload: {
        code: 400,
        message: errors.join("; ")
      }
    };
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    const payload = await safeParseJson(response);

    return {
      status: response.status,
      payload:
        payload && typeof payload === "object"
          ? payload
          : {
              code: response.status,
              message: "Invalid translate response"
            }
    };
  } catch (error) {
    return {
      status: 502,
      payload: {
        code: 502,
        message: error instanceof Error ? error.message : "Translate upstream failed"
      }
    };
  }
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function validateTranslateRequest(body) {
  const errors = [];
  if (!body.text) {
    errors.push("text is required");
  }
  if (!body.target_lang) {
    errors.push("target_lang is required");
  }
  return errors;
}

function normalizeAltCount(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 3);
}

