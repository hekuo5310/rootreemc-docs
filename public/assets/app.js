const I18N_LANG_STORAGE_KEY = "rootree_i18n_lang_v1";
const I18N_CACHE_STORAGE_KEY = "rootree_i18n_cache_v1";
const MAX_TRANSLATE_CONCURRENCY = 2;
const TRANSLATE_RETRY_DELAYS_MS = [300, 900];

initSidebarMenu();
initTocObserver();
initI18n();

function initSidebarMenu() {
  const menuButton = document.querySelector(".menu-button");
  const sidebar = document.querySelector(".sidebar");
  if (!menuButton || !sidebar) return;

  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    sidebar.classList.toggle("open");
  });
}

function initTocObserver() {
  const tocLinks = Array.from(document.querySelectorAll(".toc a"));
  if (tocLinks.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const hash = `#${entry.target.id}`;
        for (const link of tocLinks) {
          const active = link.getAttribute("href") === hash;
          link.classList.toggle("active", active);
        }
      }
    },
    {
      rootMargin: "0px 0px -70% 0px",
      threshold: [0, 1]
    }
  );

  for (const link of tocLinks) {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) observer.observe(target);
  }
}

function initI18n() {
  const switcher = document.querySelector("[data-i18n-switcher]");
  const configNode = document.getElementById("i18n-config");
  if (!switcher || !configNode) return;

  const config = parseI18nConfig(configNode.textContent);
  if (!config || !config.enabled || !Array.isArray(config.languages) || config.languages.length < 2) return;

  const translatableNodes = collectTranslatableTextNodes(document.body);
  const sourceTitle = document.title;
  const memoryCache = new Map();
  const persistentCache = config.cache ? readTranslationCache() : {};
  let activeTaskId = 0;
  let saveCacheTimer = null;

  const initialLanguage = resolveInitialLanguage(config);
  switcher.value = initialLanguage;
  applyLanguage(initialLanguage);

  switcher.addEventListener("change", () => {
    applyLanguage(switcher.value);
  });

  async function applyLanguage(targetLang) {
    activeTaskId += 1;
    const taskId = activeTaskId;
    switcher.disabled = true;
    if (config.autoApplySaved) {
      safeSetLocalStorage(I18N_LANG_STORAGE_KEY, targetLang);
    }

    if (targetLang === config.sourceLang) {
      restoreSourceNodes(translatableNodes);
      document.title = sourceTitle;
      document.documentElement.lang = config.sourceLang;
      if (taskId === activeTaskId) {
        switcher.disabled = false;
      }
      return;
    }

    const coreMap = await buildTranslatedCoreMap(translatableNodes, targetLang, config, {
      memoryCache,
      persistentCache,
      schedulePersistCache
    });
    if (taskId !== activeTaskId) return;

    for (const entry of translatableNodes) {
      const translatedCore = coreMap.get(entry.core) || entry.core;
      entry.node.nodeValue = `${entry.leading}${translatedCore}${entry.trailing}`;
    }

    const translatedTitle = await translateText(sourceTitle, config.sourceLang, targetLang, config, {
      memoryCache,
      persistentCache,
      schedulePersistCache
    });
    if (taskId !== activeTaskId) return;

    document.title = translatedTitle || sourceTitle;
    document.documentElement.lang = targetLang;
    switcher.disabled = false;
  }

  function schedulePersistCache() {
    if (!config.cache || saveCacheTimer) return;
    saveCacheTimer = window.setTimeout(() => {
      safeSetLocalStorage(I18N_CACHE_STORAGE_KEY, JSON.stringify(persistentCache));
      saveCacheTimer = null;
    }, 180);
  }
}

function collectTranslatableTextNodes(rootElement) {
  const skipTagNames = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "SELECT", "OPTION"]);
  const nodes = [];
  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parentElement = node.parentElement;
        if (!parentElement) return NodeFilter.FILTER_REJECT;
        if (skipTagNames.has(parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (parentElement.closest("[data-i18n-skip]")) return NodeFilter.FILTER_REJECT;

        const text = node.nodeValue || "";
        const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/u);
        const core = match ? match[2] : "";
        if (!core.trim()) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let current = walker.nextNode();
  while (current) {
    const text = current.nodeValue || "";
    const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/u);
    const leading = match ? match[1] : "";
    const core = match ? match[2] : text;
    const trailing = match ? match[3] : "";
    nodes.push({
      node: current,
      leading,
      core,
      trailing
    });
    current = walker.nextNode();
  }

  return nodes;
}

function restoreSourceNodes(entries) {
  for (const entry of entries) {
    entry.node.nodeValue = `${entry.leading}${entry.core}${entry.trailing}`;
  }
}

async function buildTranslatedCoreMap(entries, targetLang, config, cacheContext) {
  const uniqueCores = [...new Set(entries.map((entry) => entry.core))];
  const queue = [...uniqueCores];
  const translatedMap = new Map();
  const workerCount = Math.min(MAX_TRANSLATE_CONCURRENCY, queue.length);
  const workers = [];

  for (let index = 0; index < workerCount; index += 1) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const core = queue.shift();
          if (!core) continue;
          const translated = await translateText(core, config.sourceLang, targetLang, config, cacheContext);
          translatedMap.set(core, translated || core);
        }
      })()
    );
  }

  await Promise.all(workers);
  return translatedMap;
}

async function translateText(text, sourceLang, targetLang, config, cacheContext) {
  if (targetLang === sourceLang) return text;
  const cacheKey = `${sourceLang}__${targetLang}__${text}`;

  if (cacheContext.memoryCache.has(cacheKey)) {
    return cacheContext.memoryCache.get(cacheKey);
  }
  if (config.cache && cacheContext.persistentCache[cacheKey]) {
    const cachedValue = cacheContext.persistentCache[cacheKey];
    cacheContext.memoryCache.set(cacheKey, cachedValue);
    return cachedValue;
  }

  try {
    const payload = await requestTranslationWithRetry(config.endpoint, {
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
      alt_count: config.altCount
    });
    const translated = parseTranslateResponse(payload, text);
    cacheContext.memoryCache.set(cacheKey, translated);
    if (config.cache) {
      cacheContext.persistentCache[cacheKey] = translated;
      cacheContext.schedulePersistCache();
    }
    return translated;
  } catch {
    return text;
  }
}

async function requestTranslationWithRetry(endpoint, requestBody) {
  for (let attempt = 0; attempt <= TRANSLATE_RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      return response.json();
    }

    const isRateLimited = response.status === 429;
    const hasRetry = attempt < TRANSLATE_RETRY_DELAYS_MS.length;
    if (!isRateLimited || !hasRetry) {
      throw new Error(`Translate request failed: ${response.status}`);
    }

    await waitFor(TRANSLATE_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error("Translate request failed");
}

function parseTranslateResponse(payload, fallbackText) {
  if (payload && payload.code === 200 && typeof payload.data === "string") {
    return payload.data;
  }
  if (payload && typeof payload.data === "string" && payload.data.trim()) {
    return payload.data;
  }
  return fallbackText;
}

function parseI18nConfig(rawJson) {
  try {
    const parsed = JSON.parse(rawJson || "{}");
    return {
      enabled: parsed.enabled === true,
      endpoint: typeof parsed.endpoint === "string" ? parsed.endpoint.trim() : "",
      sourceLang: normalizeLanguageCode(parsed.sourceLang || "zh"),
      defaultLang: normalizeLanguageCode(parsed.defaultLang || parsed.sourceLang || "zh"),
      altCount: normalizeAltCount(parsed.altCount),
      cache: parsed.cache !== false,
      autoApplySaved: parsed.autoApplySaved !== false,
      languages: Array.isArray(parsed.languages)
        ? parsed.languages
            .map((language) => ({
              code: normalizeLanguageCode(language?.code || ""),
              label:
                typeof language?.label === "string" && language.label.trim()
                  ? language.label.trim()
                  : normalizeLanguageCode(language?.code || "").toUpperCase()
            }))
            .filter((language) => language.code)
        : []
    };
  } catch {
    return null;
  }
}

function resolveInitialLanguage(config) {
  const allowedCodes = new Set(config.languages.map((language) => language.code));
  const saved = safeGetLocalStorage(I18N_LANG_STORAGE_KEY);
  if (config.autoApplySaved && saved && allowedCodes.has(saved)) {
    return saved;
  }
  return allowedCodes.has(config.defaultLang) ? config.defaultLang : config.sourceLang;
}

function readTranslationCache() {
  try {
    const raw = safeGetLocalStorage(I18N_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeGetLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failure
  }
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

function waitFor(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
