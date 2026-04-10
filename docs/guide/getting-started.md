---
title: 快速上手
order: 2
---

# 快速上手

## 目录约定

- `docs/`：文档源文件
- `src/`：构建器核心实现
- `public/`：静态资源
- `dist/`：构建输出目录

## 构建命令

```bash
npm run build
```

命令会递归扫描 `docs/` 下的 Markdown 文件，并根据路径自动生成对应的 URL 路由。

## 本地开发

```bash
npm run dev
```

启动后会自动构建并开启本地服务，文档、样式或构建器改动都会触发重新构建。

