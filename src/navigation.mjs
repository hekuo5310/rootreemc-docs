import { compareByOrderThenTitle, titleFromSegment, toPosixPath } from "./utils.mjs";

export function buildSidebarGroups(documents) {
  const groups = new Map();

  for (const doc of documents) {
    const relative = toPosixPath(doc.relativePath);
    const [firstSegment = ""] = relative.split("/");
    const sectionKey = firstSegment === "index.md" ? "" : firstSegment;
    const label = sectionKey ? titleFromSegment(sectionKey) : "概览";

    if (!groups.has(sectionKey)) {
      groups.set(sectionKey, {
        key: sectionKey || "root",
        title: label,
        items: []
      });
    }

    groups.get(sectionKey).items.push({
      route: doc.route,
      title: doc.title,
      order: doc.order
    });
  }

  const sortedGroups = [...groups.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "zh-Hans-CN")
  );
  for (const group of sortedGroups) {
    group.items.sort(compareByOrderThenTitle);
  }

  return sortedGroups;
}

export function buildNavItems(configNav, documents) {
  if (Array.isArray(configNav) && configNav.length) {
    return configNav.map((item) => ({
      text: item.text,
      link: item.link
    }));
  }

  const navItems = [];
  const home = documents.find((doc) => doc.route === "/");
  if (home) {
    navItems.push({ text: home.title, link: home.route });
  }

  const seenSections = new Set();
  for (const doc of documents) {
    const segment = toPosixPath(doc.relativePath).split("/")[0];
    if (!segment || segment === "index.md" || seenSections.has(segment)) {
      continue;
    }
    seenSections.add(segment);
    navItems.push({
      text: titleFromSegment(segment),
      link: doc.route
    });
  }

  return navItems;
}

