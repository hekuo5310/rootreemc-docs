# Rootree 文档系统

一个极简风格的静态文档系统，目标能力对标 VuePress 的基础文档场景：

- 自动将 Markdown 渲染为 HTML
- 自动生成页面路由
- 提供顶部导航、侧边栏文档结构、页面目录
- 全站白色背景，黑色文字与黑色按钮/边框

## 使用方式

```bash
npm run build
```

构建后输出到 `dist/`。

```bash
npm run dev
```

本地开发模式，默认端口 `4173`，支持改动后自动重建。

## 目录结构

```text
docs/               # Markdown 文档源
public/assets/      # 样式与前端脚本
scripts/            # build/dev 入口
src/                # 文档系统核心实现
test/               # 基础单元测试
```

## Markdown 路由规则

- `docs/index.md` -> `/`
- `docs/guide/getting-started.md` -> `/guide/getting-started/`
- `docs/reference/index.md` -> `/reference/`

## Markdown 必填规范

每个文档文件建议按下面规范写，团队协作时最稳：

1. 文件必须放在 `docs/` 目录下，扩展名必须是 `.md`。
2. 页面必须有一个一级标题（`# 页面标题`）。
3. 建议在文件开头写 Frontmatter，至少包含 `title` 和 `order`。

示例：

```md
---
title: 快速上手
order: 2
---

# 快速上手

## 安装

正文内容...
```

说明：
- `title` 用于侧边栏和页面标题展示。
- `order` 用于同分组内排序，数字越小越靠前。
- 如果未写 `title`，系统会退化为“首个标题/文件名”作为标题。

## Markdown 提示块

支持 GitHub 风格提示块语法：

```md
> [!NOTE]
> 你好
```

也支持警告样式（会渲染为深色警告卡片）：

```md
> [!WARNING]
> 你好
```

## Markdown Task List

支持任务列表（Task List）语法：

```md
- [x] 玩家链接协议
- [ ] Spigot插件支持
- [ ] TFL插件([旧版仓库](https://github.com/hekuo5310/TranforCpp))支持
```

该语法会渲染为任务列表组件（`task-list` / `task-list-item checked|pending`），不是表单输入控件。

## 配置

在 `docs.config.mjs` 中配置站点标题、输出目录与导航项。

## 测试

```bash
npm test
```

## 部署

本项目是纯静态站点，构建产物为 `dist/`，可直接部署到 Vercel 或 Cloudflare Pages（CF）。

### 部署到 Vercel

#### 方式一：Vercel 控制台（推荐）

1. 将仓库推送到 GitHub/GitLab/Bitbucket。
2. 登录 Vercel 并导入该仓库。
3. 在项目构建设置中填写：
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 点击 Deploy，完成后即可获得线上地址。

#### 方式二：Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

首次运行 `vercel` 时，按提示选择项目并确认：
- Build Command: `npm run build`
- Output Directory: `dist`

### 部署到 Cloudflare Pages（CF）

#### 方式一：Cloudflare Pages 控制台（推荐）

1. 登录 Cloudflare，进入 `Workers & Pages`。
2. 选择 `Create application` -> `Pages` -> 连接你的 Git 仓库。
3. 构建配置填写：
   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 点击 Save and Deploy，等待部署完成。

#### 方式二：Wrangler CLI

```bash
npm i -g wrangler
wrangler login
wrangler pages project create rootreemc-docs
npm run build
wrangler pages deploy dist --project-name rootreemc-docs
```

### 部署前自检

```bash
npm test
npm run build
```

确认通过后再推送部署，可以减少线上构建失败概率。
