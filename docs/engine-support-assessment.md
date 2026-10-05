# treeData 搜索支持完善 — 可行性评估

> 评估日期：2026-02-XX　评估对象：原 `src/data/common.ts` 的 `treeData` 及其消费方
> 方法：静态代码走查 + 对 5 个目标站点做真实 HTTP 探针（curl，实测响应码/响应体）
>
> **落地状态**：本轮只落地了 IQDB 与 TRACE.MOE 的完善，两者已迁入 `src/engines/`
> 引擎描述符架构（见 §二 改造方向）。ASCII2D / SAUCENAO / EHENTAI 按要求保持不变，
> 界面上以「更多引擎」只读列表呈现，避免用户误以为功能缺失。

---

## 一、结论速览

| 引擎 | 现状 | 可行性 | 结论 |
|---|---|---|---|
| **IQDB** | 已部署 | ✅ 可用 | 8 个图库已全部启用；本轮修好了代理协议、解析与展示 |
| **TRACEMOE** | 已部署 | ✅ 可用 | 参数正确；本轮接入中文番剧名、片段播放与额度提示 |
| **ASCII2D** | `status: 0` 开发中 | ⚠️ 开发环境可行、生产不可行 | **可以做**（约 1 天），需服务端处理 Cloudflare clearance |
| **SAUCENAO** | `status: 0` 开发中 | ❌ 匿名 API 已被官方关闭 | **不建议做**，需付费 API Key |
| **EHENTAI** | `status: -1` 已禁用 | ❌ 网络不可达 + 需登录 Cookie + ToS 限制 | **建议移除**，换成别的引擎 |

**最关键的一条**：这次任务真正的成本不在"三个引擎"，而在原 `Tree.vue` / `Result.vue` 里把引擎写死的架构。该架构问题**已在本轮解决**（引擎描述符化），EHENTAI / SAUCENAO 明确放弃。

---

## 二、架构问题与改造（已完成）

原 `treeData` 只是一个**选项容器**，不携带任何接入元数据，导致新引擎的接入逻辑散落在多处硬编码：

| 关注点 | 原位置 | 问题 |
|---|---|---|
| 引擎清单 / 子选项 | `src/data/common.ts` `treeData` | 只有 `id/label/disabled`，没有"请求方法 / 端点 / 载荷格式"字段 |
| 子选项 → 请求参数名 | `src/views/Main/components/Tree.vue` | 靠 `id.split('-')[1]` **字符串猜测**；仅对"选项名 == 参数名"的引擎成立 |
| 请求分发 | 同文件 `switch (engineType)` | 引擎越多，switch 越长；新增引擎必须改这里 |
| 结果渲染 | `src/views/Main/components/Result.vue` | 三个 `v-if` 把字段映射写死在模板里；新引擎 = 新分支 |
| 代理配置 | `vite.config.ts`、`vercel.json`、`api/proxy.js` | 三处重复的端点白名单，新增引擎要同步改三处 |

另外 `ResultType` 当时是一锅"各引擎字段拼盘"：`similarity` 同时承载 trace.moe 的 `0~1` 小数与 IQDB 的 `0~100` 数字，于是 `> 0.9` 与 `> 90` 两种比较并存。

### 实际落地的改法

1. 引擎升级为**描述符**，落在 `src/engines/index.ts`：

```ts
export interface EngineDef {
  id: EngineId
  label: string
  subtitle: string
  description: string
  status: -1 | 0 | 1
  accent: string
  options: EngineOption[]              // 子选项显式声明 param / value
  request: (upload: SearchUpload, options: Record<string, unknown>) => Promise<unknown>
  parse: (raw: unknown) => ResultType[]  // 统一输出归一化结果
}
```

2. 引擎实现拆到 `src/engines/iqdb.ts`、`src/engines/tracemoe.ts`，各自负责请求与解析。
3. 展示字段由 `collectFields(engineId)` 提供 `ResultField[]`，`ResultCard.vue` 按
   `kind`（tag / link / text / timestamp）动态渲染，**模板里不再出现任何引擎判断**。
4. `similarity` 统一归一化为 `0~100` 整数，双语义消除。
5. 图片来源统一成 `SearchUpload`（本地文件 / 粘贴板 / 远程 URL），引擎只需处理"一个文件"。

---

## 三、现有引擎参数核对（实测）

### IQDB —— 参数完全正确（无遗漏图库）

抓取 `https://iqdb.org/` 实际表单（需带 `?ckatt=1` 绕过 cookie 探测）：

```html
<form action="/" method="post" enctype="multipart/form-data">
<input type="hidden" name="MAX_FILE_SIZE" value="8388608">
<input type="checkbox" name="service[]" value="1" checked>  Danbooru
<input type="checkbox" name="service[]" value="2" checked>  Konachan
<input type="checkbox" name="service[]" value="3" checked>  yande.re
<input type="checkbox" name="service[]" value="4" checked>  Gelbooru
<input type="checkbox" name="service[]" value="5" checked>  Sankaku Channel
<input type="checkbox" name="service[]" value="6" checked>  e-shuushuu
<input type="checkbox" name="service[]" value="11" checked> Zerochan
<input type="checkbox" name="service[]" value="13" checked> Anime-Pictures
<input type="file" name="file" id="file">
<input type="text" name="url" id="url">
<label>[ <input type="checkbox" name="forcegray"> ignore colors ]</label>
```

- 用正则完整枚举表单，**全部图库只有 8 个**：`1 Danbooru`、`2 Konachan`、`3 yande.re`、`4 Gelbooru`、`5 Sankaku Channel`、`6 e-shuushuu`、`11 Zerochan`、`13 Anime-Pictures`（`7/8/9/10/12` **不存在**，编号是历史空号）。
- `Tree.vue:55` 的 `service: [1,2,3,4,5,6,11,13]` 与这 8 个默认勾选项**完全一致，无遗漏** ✅
- `iqdb-forcegray` → `forcegray`（值 `'on'`）**真实存在** ✅
- axios 1.9 对扁平数组序列化为 `service[]=1&service[]=2...`（依据 `node_modules/axios/lib/helpers/toFormData.js:154-166`），与 `service[]` 字段名匹配 ✅

**唯一可扩展点**：表单还有 `<input type="text" name="url">`，即 IQDB 支持**用图片 URL 检索**，目前 UI 未暴露（当前只走文件上传）。

### TRACEMOE —— 参数正确

- `tracemoe-cutBorders` → `cutBorders: true` ✅（trace.moe 官方参数名）
- `anilistInfo: true` ✅，实测返回 `anilist.title.{native,romaji,english,chinese}`、`episode`、`from/to`、`similarity`
- 💡 已实测到响应含 **`title.chinese`**（如「魔道祖师」「约定的梦幻岛」），比现在用的 `title.native` 更适合中文界面（`src/data/format.ts:76` 用的是 native）
- ⚠️ 实测响应含 `quota:100, quotaUsed:1`——匿名额度约 100 次/天，**按 IP 计**。`vercel.json` 里 `/trace` 由单个 Serverless 出口转发，多人使用会共享同一 IP 配额。

---

## 四、待接入引擎逐项评估

### 4.1 SAUCENAO —— ❌ 官方已关闭匿名 API

实测 `POST https://saucenao.com/search.php`（带 `url` / `output_type=2` / `db=999`）：

```json
{"header":{"status":-1,"message":"The anonymous account type does not permit API usage."}}
```

- 这是**账号类型层面的显式拒绝**（`status:-1` + 明确文案），不是临时限流，页面本身 `GET https://saucenao.com/` 返回 200。
- 与 IP / UA / 参数组合无关：多次不同参数重试均返回同一句。
- 含义：任何接入都必须申请 API Key（`output_type=2` 需付费档位，且免费档有 4 次/30 秒、100 次/天的限制）。
- 参考：[SauceNAO JSON API 说明](https://saucenao.com/user.php?page=search-api)、[Anonymous account 讨论](https://github.com/asimpleidea/salsa)

**结论**：`status: -1` 保持禁用，或在文档里写清"需 API Key"。不建议为它引入 Key 管理 + 配额逻辑。

### 4.2 EHENTAI —— ❌ 三重阻塞

实测网络探针（本环境）：

| 目标 | 结果 |
|---|---|
| `https://e-hentai.org/up/loadimage` | `status=000`，20s 超时 |
| `https://forums.e-hentai.org/` | `status=000`，20s 超时 |
| `https://api.e-hentai.org/api.php` | `status=000`，20s 超时 |

阻塞点：

1. **网络不可达**：EH 系对数据中心 / VPS / 代理出口 IP 屏蔽，本环境三个域名全部连接超时（非 403，是 TCP 层不通）。Vercel Serverless 出口同样属于被屏蔽类型，生产环境大概率同样不可用。
2. **认证要求**：图片搜索（`/up/loadimage` 的 file 模式）官方文档明确要求携带登录 cookie（`ipb_member_id` / `ipb_pass_hash`），官方 API（`api.php`）只提供元数据查询、**不提供以图搜图**。
3. **ToS 限制**：把用户上传的图片经服务端转发到 EH 属于其使用条款灰区。

**结论**：建议从 `treeData` 中**移除** `ehentai` 节点（或保留 `disabled: true` 并注明原因），不要投入实现。

### 4.3 ASCII2D —— ⚠️ 唯一"技术可行但需服务端配合"的

实测抓取 `https://ascii2d.net/` 表单结构：

```html
<form action="/search/uri" method="post">
  <input name="utf8" type="hidden" value="&#x2713;">
  <input type="hidden" name="authenticity_token" value="Kpj7TjYQHe+...">
  <input id="uri-form" name="uri" type="url" placeholder="画像のURL">
</form>
<form id="file_upload" enctype="multipart/form-data" action="/search/file" method="post">
  <input name="utf8" type="hidden" value="&#x2713;">
  <input type="hidden" name="authenticity_token" value="4nGVr2hw...">
  <input id="file-form" name="file" type="file">
</form>
```

**技术要点**

| 项 | 内容 |
|---|---|
| 两种检索模式 | `color`（按色彩）/ `bovw`（按特征），体现在跳转后详情页路径 `/search/color/...`、`/search/bovw/...`，POST 参数相同 |
| 端点 | 文件上传 `POST /search/file`（multipart）；URL 检索 `POST /search/uri` |
| 必需字段 | `utf8=✓` + Rails `authenticity_token`（每次 GET 首页动态生成） |
| 结果形态 | HTML，需 cheerio 抓 `item-box` 列表（作者/来源/缩略图/详情链接） |
| 计量 | 无公开配额，但有速率风控 |

**实测阻塞（重要）**

| 请求 | 结果 |
|---|---|
| `GET /`（浏览器 UA + cookie jar） | `200` ✅ |
| `POST /search/uri`（无 token） | `403` + Cloudflare `Just a moment...` |
| `POST /search/uri`（带首页 token + 会话 cookie） | `403` + Cloudflare `Just a moment...` |

即：ascii2d 挂在 Cloudflare 盾后，**只有 GET 能过，任何 POST 都会被 JS 质询拦截**。

**因此的落地约束**

- ❌ 浏览器直连：CORS + CF 质询，不可行。
- ❌ Vite dev proxy：拿到 GET 200 但 POST 仍 403（cf_clearance cookie 需执行 JS 才能取得）。
- ❌ Vercel Serverless：同上，且出口 IP 更容易被 CF 标记。
- ✅ **唯一现实路径**：本地 Node 代理，需要**先解决 Cloudflare JS 质询**——即拿到浏览器才会生成的 `cf_clearance` cookie（两条路：起步用 Playwright/真实浏览器手动过盾一次并持久化 cookie；或用第三方 solver）。拿到 clearance 后，GET 首页取 `authenticity_token` → `POST /search/file`（携带同一 cookie jar）即可；**仅在本机开发环境可用，生产不可交付**。

> 实测数据点：纯 curl 流程（GET 首页拿 cookie + token 后再 POST）**仍然 403**，说明 `cf_clearance` 缺失是硬阻塞，不是"带上 cookie 就行"。

**成本估算**：代理层约 80~150 行（CF clearance 获取/持久化 + 会话保持 + token 提取 + 转发），解析层约 60~100 行 cheerio（HTML 结构脆、易随站点改版失效），结果渲染若走通用 `fields` 方案则约 30 行，合计 **1 天左右**（含过盾调试）。风险等级：**高**（依赖第三方站点 HTML 与 CF 策略，无契约保障）。

### 4.4 替代方案（若目标是"再多几个能用的引擎"）

| 方案 | 可行性 | 说明 |
|---|---|---|
| **AnimeTrace**（`api.animetrace.com`） | 较高 | 公开 AI 以图搜番接口，中文友好，与 trace.moe 形成互补；需确认是否要 Key |
| **Yandex / Bing 以图搜图** | 低 | 无公开 API，签名与风控复杂 |
| **IQDB 扩展** | 中 | 8 个图库已全部启用，**无新增图库可开**；仅剩"图片 URL 检索"可补，性价比一般 |
| **自建 / 第三方聚合** | 视情况 | 如第三方聚合站，但引入新的可用性依赖 |

---

## 五、实施路线

| 阶段 | 内容 | 状态 |
|---|---|---|
| **P0** | 引擎描述符重构：`engines/`（request / parse / fields）+ `Tree.vue` 去 switch + 结果通用渲染 + `ResultType` 归一化 | ✅ 已完成 |
| **P1** | trace.moe 改用 `title.chinese`、接入片段播放与 `quota` 额度提示；IQDB 补 URL 检索入口；上传支持粘贴 / 拖拽 / URL | ✅ 已完成 |
| **P1.5** | 交互与主题重做：设计令牌 + 浅色/深色切换、骨架屏、星标置顶、最近搜索、响应式布局 | ✅ 已完成 |
| **P1.6** | 修复 `iqdb.org` 明文 HTTP 301 导致的代理失效（dev 与 Serverless 两处 target 改 https） | ✅ 已完成 |
| **P2** | ASCII2D 接入（含 CF clearance 处理），生产环境显式降级/隐藏 | ⏸ 按需求暂不做 |
| **P3** | `ehentai` / `saucenao` 在界面上标注为「开发中」只读条目 | ✅ 已完成（保留节点，不实现） |
| **P4（可选）** | AnimeTrace 接入验证，作为 EH / SAUCENAO 的替代位 | 待定 |

**P0 的价值**：改造前每接一个引擎要改 5 个文件；现在只需在 `src/engines/index.ts` 里加一段描述符 + 一个 parse 函数，边际成本从"半天"降到"1~2 小时"。

### 明确建议放弃

- **EHENTAI**：网络不可达（`status=000`）+ 需登录 Cookie + ToS 风险，投入产出比最差。
- **SAUCENAO**：`"The anonymous account type does not permit API usage."`——没有 API Key 就无从谈起。

---

## 六、风险与遗留问题

1. **Cloudflare 对抗不可控**：ASCII2D 的可用性取决于 CF 策略，随时可能失效；不应作为主打引擎。
2. **HTML 解析脆弱**：IQDB / ASCII2D 均靠 cheerio 抓取，改版即失效。本轮已让 `iqdb.parse` 对结构变化保持宽容（取不到字段留空而非抛错），并在无命中时给出可读提示。
3. **配额按 IP 共享**：trace.moe 实测 `quota:100`（`/me` 接口），走 Serverless 代理时所有用户共享。本轮已加额度展示与 429 文案，但**未做节流**。
4. ~~**`getHMS` 时区错误**~~：已修正，改为按秒数直接换算，不再经过 `toISOString`。
5. **`ResultType.similarity` 语义**：已在解析层统一为 `0~100` 整数，新增引擎时必须遵守该约定。
6. **Serverless 代理路径探测**：`api/proxy.js` 现在会从 `x-forwarded-uri` / `x-now-route-matches` 兜底取原始路径。该逻辑基于 Vercel 的通用行为，**未在真实 Vercel 环境验证过**，首次部署后建议实测一次 `/iqdb` 与 `/trace/me`。
