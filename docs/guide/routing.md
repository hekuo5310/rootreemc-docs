---
title: 路由机制
order: 3
---

# 路由机制

## 映射规则

- `docs/index.md` -> `/`
- `docs/guide/getting-started.md` -> `/guide/getting-started/`
- `docs/reference/index.md` -> `/reference/`

## Markdown 链接转换

系统会将文档内的 `*.md` 链接自动转换为站点内部路由，例如：

```md
[快速上手](./getting-started.md)
```

会被输出为 `/guide/getting-started/`，并保留锚点信息。

## 导航构建

顶部导航可以在 `docs.config.mjs` 中声明，也可以根据文档目录自动推导。

