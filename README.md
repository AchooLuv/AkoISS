<div align="center">

# AKO 以图搜源 · AkoISS

**在线以图搜图工具：反查动漫图片的原始出处，定位番剧截图出自哪一集哪一秒**

[![在线体验](https://img.shields.io/badge/在线体验-img.muri.life-6d4df6?style=for-the-badge)](https://img.muri.life)
[![License](https://img.shields.io/badge/license-MIT-0f9d8f?style=for-the-badge)](./LICENSE)

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pinia](https://img.shields.io/badge/Pinia-2-ffd859?logo=pinia&logoColor=black)](https://pinia.vuejs.org/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.9-409eff?logo=elementplus&logoColor=white)](https://element-plus.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

[在线体验](https://img.muri.life) · [功能](#-功能) · [快速开始](#-快速开始) · [架构说明](#-架构说明) · [已知限制](#-已知限制)

</div>

---

> **关键词**：以图搜图 · 以图搜番 · 图片出处查询 · 反向搜图 · 动漫截图识别 · 番剧截图定位 · IQDB · TRACE.MOE · reverse image search · anime scene search
>
> 如果你在找「怎么查一张动漫图出自哪里」「某张截图是哪部番第几集」，这个项目就是做这件事的：粘贴图片 → 得到图库原图链接 / 番剧名 + 集数 + 时间点。

## 这是什么

**AkoISS（AKO Image Source Search）** 是一个纯前端的在线以图搜图 Web 应用，把两个以图搜图引擎聚合成一个界面：

| 引擎 | 它能回答什么 | 数据来源 |
| --- | --- | --- |
| **IQDB** | 这张图出自哪个图库？原图在哪？ | Danbooru、Konachan、yande.re、Gelbooru、Sankaku、e-shuushuu、Zerochan、Anime-Pictures 共 8 个图库 |
| **TRACE.MOE** | 这张截图出自哪部番剧的第几集第几秒？ | trace.moe 的动画帧索引，附可播放的命中片段 |

免费、免登录、无需 API Key。支持深色模式与移动端。

## ✨ 功能

- **四种图片来源**：点击选择、拖拽、`Ctrl + V` 直接粘贴截图、填入图片 URL
- **两个搜索引擎，同一套结果体验**
  - IQDB：展示来源图库（含站点图标）、原站帖子号、原图尺寸、图片评级，并把 Danbooru 系标签译成中文（`absurdres` → 超高分辨率）
  - TRACE.MOE：展示番剧名（优先中文标题）、集数、出现时间区间，可直接播放命中片段
- **结果交互**：按匹配度排序、星标把重点候选置顶、点击大图预览、原图直达、加载骨架屏
- **解释性提示**：两个引擎的「匹配度」含义不同会明确说明；被相似度阈值过滤掉的候选数量也会如实告知，避免"接口有数据却看不到结果"的困惑
- **额度提示**：实时显示 TRACE.MOE 当日剩余额度，避免撞上限流
- **最近搜索记录**，便于回看
- **主题**：浅色 / 深色一键切换并记忆，首次访问跟随系统偏好
- **SEO 就绪**：完整 meta / Open Graph / Twitter Card / JSON-LD 结构化数据、`robots.txt`、`sitemap.xml`、PWA manifest

### SEO 清单

| 项 | 位置 |
| --- | --- |
| title / description / keywords | [`index.html`](./index.html) |
| Open Graph（含 1200×630 卡片图） | [`index.html`](./index.html)、`public/og-image.png` |
| Twitter Card | [`index.html`](./index.html) |
| JSON-LD 结构化数据（WebSite + WebApplication） | [`index.html`](./index.html) |
| 路由级动态 title / description / canonical | [`src/utils/seo.ts`](./src/utils/seo.ts)、[`src/router/index.ts`](./src/router/index.ts) |
| 爬虫规则与站点地图 | `public/robots.txt`、`public/sitemap.xml` |
| PWA manifest | `public/site.webmanifest` |

> OG 图以 `public/og-image.svg` 为源文件，导出为 `og-image.png`（主流社交平台对 SVG 的
> OG 图支持不统一）。改过 SVG 后需按 [`tools/og-image-export.html`](./tools/og-image-export.html)
> 里的步骤重新导出一次。

## 🚀 快速开始

```bash
# 环境要求：Node.js >= 16（本项目在 v22 上验证）
npm install

npm run dev        # 启动开发服务器（内含图源代理，无需额外配置）
npm run build      # 类型检查 + 生产构建
npm run preview    # 本地预览构建产物
npm run type-check # 仅做 vue-tsc 类型检查
npm run lint       # ESLint 校验并自动修复
```

> 开发环境的跨域由 Vite `server.proxy` 处理；生产环境的 `/iqdb` 与 `/trace`
> 由 Vercel Serverless 函数 `api/proxy.js` 转发。

## 🧱 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Vue 3.5（`<script setup>`） |
| 构建 | Vite 6 + TypeScript 5.6 + vue-tsc |
| 状态管理 | Pinia 2（setup store 写法） |
| UI | Element Plus 2.9 + `@element-plus/icons-vue` |
| 路由 | Vue Router 4（history 模式） |
| 请求 / 解析 | axios、cheerio（解析 IQDB 返回的 HTML） |
| 样式 | SCSS + 设计令牌（CSS 变量）双主题 |
| 部署 | Vercel（静态站点 + Serverless 代理） |

## 🏗 架构说明

### 目录结构

```
api/proxy.js               Vercel Serverless 代理（/iqdb、/trace → 图源）
public/                    robots.txt、sitemap.xml、site.webmanifest、og-image.png/svg
tools/og-image-export.html og-image 导出页（开发工具，不参与部署）
src/
├─ main.ts                 入口：装配 Element Plus / 路由 / Pinia / 主题
├─ router/index.ts         路由表 + 路由级 SEO（title / description / canonical）
├─ views/
│  ├─ Main/Index.vue       主界面：左侧操作面板 + 右侧结果区
│  └─ 404/                 404 页
├─ components/             UploadPanel / EngineSelector / EngineOptions / ResultCard /
│                          ResultsView / TraceQuota / SearchHistory / ThemeToggle
├─ engines/                引擎层：请求怎么发、响应怎么解析
│  ├─ index.ts             引擎描述符 ENGINES（新增引擎的唯一入口）
│  ├─ iqdb.ts              IQDB 请求与 HTML 解析
│  └─ tracemoe.ts          TRACE.MOE 请求、解析与额度查询
├─ composables/            useSearch / useImageInput / useTraceQuota
├─ stores/                 search / result / theme
├─ utils/                  http / file / format / notify / seo / tags
└─ assets/styles/          tokens.scss（设计令牌）+ main.scss（全局样式）
```

### 设计要点

**1. 引擎描述符 —— 新增图源的边际成本约 1~2 小时**

界面层不出现任何引擎判断（没有 `switch (engine)`、没有按引擎写的 `v-if`）。每个引擎在
`src/engines/index.ts` 里声明「请求怎么发、响应怎么解析、卡片展示哪些字段」：

```ts
{
  id: 'iqdb',
  label: 'IQDB',
  options: [{ id: 'forcegray', label: '忽略色彩', param: 'forcegray', value: 'on' }],
  request: (upload, options) => { /* 返回原始响应 */ },
  parse: (raw) => [/* 归一化成 ResultType[] */],
}
```

结果渲染由 `ResultField[]`（`tag` / `link` / `text` / `timestamp` / `tags`）驱动，
因此新增引擎只需加一段描述符 + 一个 `parse` 函数。

**2. 统一的结果模型**

`similarity` 在解析层统一归一化为 `0~100` 的整数（IQDB 原生是百分数、trace.moe 是 `0~1`
小数），避免出现 `> 0.9` 与 `> 90` 两种比较并存。

**3. 代理必须走 HTTPS**

`iqdb.org` 对明文 HTTP 会直接 `301` 跳转到 HTTPS，因此 `vite.config.ts` 与 `api/proxy.js`
两处的上游地址都必须是 `https://`，否则代理层拿到的是跳转页而不是搜索结果。

**4. 双主题**

所有颜色收敛到 `src/assets/styles/tokens.scss` 的 `--ako-*` CSS 变量，并把 Element Plus
的变量映射到同一套令牌上，因此主题切换只需在 `<html>` 上增删 `.dark` 类。

## 🔐 依赖与安全

- **无循环依赖**：`src` 下 29 个模块、59 条依赖边，经图分析（Tarjan 强连通分量）确认无环。
- **依赖保持更新**：`package.json` 使用 `^` 范围，建议定期执行 `npm update` 拉满范围内版本。
  仓库历史上的 Dependabot 告警绝大多数源于「lockfile 落后于声明的范围」，而非范围本身过宽。
- **唯一未修复项**：`braces@3.0.3`（深层嵌套 pattern 导致栈溢出，上游无补丁版本，
  `micromatch@4.0.8` 仍依赖它）。它的引入路径是
  `http-proxy-middleware → micromatch → braces`，**只存在于 Vercel Serverless 侧**，
  匹配的是写死的 `/iqdb`、`/trace` 前缀，不接触用户输入；且不在前端产物中（`dist` 内零命中），
  对浏览器端用户无影响。

## 📸 截图

> 欢迎补充自己的运行截图（建议放在 `docs/screenshot-light.png` 与 `docs/screenshot-dark.png`），
> 截图能显著提升仓库在搜索结果里的点击率。

## ⚠️ 已知限制

- **ASCII2D / SAUCENAO / EHENTAI 未接入**，原因已在界面上如实标注：
  - SauceNAO 已关闭匿名 API（返回 `The anonymous account type does not permit API usage.`），需要付费 Key
  - E-Hentai 屏蔽数据中心出口 IP，且图片搜索需要登录 Cookie
  - ASCII2D 位于 Cloudflare 之后，服务端 POST 无法通过 JS 质询

  详见 [引擎支持评估](docs/engine-support-assessment.md)
- **IQDB 依赖站点 HTML 结构**解析，站点改版后需要同步调整选择器（解析失败会给出可读提示，不会静默返回空）
- **TRACE.MOE 匿名额度按出口 IP 计算**（当前 100 次/天），Serverless 部署时所有用户共享该额度
- **两个引擎的「匹配度」不是一个量纲**：IQDB 是缩略图层面的视觉相似度，20% 以上就可能是同一张图的转载，界面已加说明

## 🗺 Roadmap

- [x] 引擎描述符架构，两个引擎统一结果模型
- [x] 粘贴 / 拖拽 / URL 多种图片来源
- [x] 双主题、响应式、结果星标与大图预览
- [x] SEO 与社交分享元信息、结构化数据
- [ ] 根据番剧名在 Bangumi 查询并展示番剧信息
- [ ] 同一张图的多引擎结果并列对比

## 🤝 贡献

欢迎提交 Issue 与 PR。开始之前建议先跑一遍：

```bash
npm run type-check && npm run lint && npm run build
```

## 📄 License

[MIT](./LICENSE) © [AchooLuv](https://github.com/AchooLuv)

---

<div align="center">

**如果这个项目帮你找到了图片来源，欢迎点一个 ⭐ Star**

本项目使用了 [IQDB](https://iqdb.org/) 与 [trace.moe](https://trace.moe/) 的公开服务，请遵守其使用条款。

</div>
