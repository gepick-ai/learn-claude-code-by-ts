# 与 opencode-app 配套对接说明（定稿）

**范围**：本包在业务上如何与 **`apps/opencode-app`** 协同——联调、HTTP/SSE、会话与消息数据流、本地存储、部署衔接；**不重复** 定义 Vite/TS/React/Tailwind/ESLint/Prettier 等纯工程项（见 **[项目工程技术选型](./项目工程技术选型.md)**）。

**适用路径**：`apps/opencode-client`  
**配套后端**：`opencode-app`（Hono），路由含 `/session`、`/sse` 等。

---

## 1. 产品定位与边界

| | 说明 |
|---|------|
| **职责** | 单页聊天 UI；经 HTTP 与会话/消息接口交互；经 SSE 消费服务端事件；`localStorage` 仅存当前 `sessionId` 引用。 |
| **非职责** | 不实现业务 API、不直连数据库；不以本地持久化为对话内容的权威来源（避免与 DB 双写）。 |
| **与现网关系** | 目标为承接 `opencode-app` 内 `src/server/frontend.html` 的前端能力；**相对路径**、**`localStorage` 键**与现网对齐以便迁移。 |

---

## 2. 开发联调：代理、请求方式与同源

| 项 | 定稿 |
|----|------|
| **开发代理** | Vite `server.proxy` 将 **`/session`、`/sse`（及同前缀）** 转发到**本机正在运行的** `opencode-app` 的 **origin**。**不**约定固定端口；在 `vite.config` 中从 **`.env` / `.env.local`** 读取（如 `OPENCODE_APP_ORIGIN` 等自洽变量名）。 |
| **请求方式** | 页面内使用 **相对路径** `fetch('/session/...')`、`EventSource('/sse/event')`，与 `frontend.html` 一致。 |
| **同源** | 生产由**同一站点**提供静态与 API（如 Hono 同时托管本包 `dist` 与 `/session`、`/sse`）；开发由 **Vite 代理**实现**等效同源**。**首版不**以「前后端分域 + 跨域 SSE + cookie 会话」为目标。若未来分域，需单独为 `fetch` 与 **SSE** 设计 CORS（含 `credentials` 时约束更严）。 |
| **环境** | 代理、机器相关配置在 `.env.local` 等，不提交秘钥；浏览器侧配置仍用 **`VITE_*`** 前缀。 |

---

## 3. 后端 API 与 `localStorage`

**路由（与 `opencode-app` 一致）**：

- `POST /session` — 创建会话  
- `GET /session/:sessionId` — 获取会话元数据  
- `GET /session/:sessionId/message` — 拉取消息列表（可 `?limit=`）  
- `POST /session/:sessionId/message` — 用户发消息、触发流式处理  
- `GET /sse/event` — **SSE** 事件流  

**`localStorage`（定稿）**：

- 只存 **`sessionId`**，键名 **`opencode-app.sessionId`**。  
- 不存整段消息 JSON；**对话与 tool 的完整事实**以 **服务端/DB** 为准。

---

## 4. 数据流：SSOT、恢复、流式、Zustand

| 主题 | 定稿 |
|------|------|
| **SSOT** | 权威数据在 `opencode-app` + 持久化层。前端 TypeScript 类型与 `apps/opencode-app/src/server/session/model.ts` 的 **`SessionMessage` / `Part`** 镜像对齐，不另建冲突 DTO。 |
| **冷启动/恢复** | 有 `sessionId`：`GET /session/:sessionId` 校验后，`GET /session/:sessionId/message` 取 **`SessionMessage[]`**，**一次灌入** Zustand（或经归一化的 store 结构），含 user/assistant 与 text、reasoning、**tool** 与 `ToolState`。 |
| **发消息** | `POST /session/:sessionId/message`；**当前轮**增量主要靠 **SSE**，不依赖本响应体带全量新历史。 |
| **实时** | `EventSource('/sse/event')`，处理 `session.part.updated`、`session.part.delta` 等，写入**同一** store/模型；**历史与流式**共用按 part 类型渲染的组件。 |
| **Zustand** | 承载 `sessionId`、历史与流式 part、**SSE 连接态/错误** 等；局部 UI 仍可用 `useState`。Hook（如 `useSessionSse`）只管 **EventSource 生命周期**与调用 store，**不**替代 store 为数据真相。 |

**可选后续**：对 `GET .../message` 使用 TanStack Query 做缓存/失效；**当前轮**仍以 SSE 为准，避免同一条 part 重复合并。

### 采用 Zustand 的简要理由（本项目）

- 跨组件共享会话/消息、在 **EventSource 回调**中写状态，比深 props/单大 Context 更直接。  
- API 小、可按 selector 订阅。  
- 与单屏 + SSE 规模匹配；若产品形态变简单，亦不必换栈。

---

## 5. 生产与 Hono 协作

| 项 | 说明 |
|----|------|
| 产物 | 本包 `build` 输出 **`dist/`**；**SPA** 需 **history fallback** 到 `index.html`（或网关等价）。 |
| 集成 | 由 `opencode-app` 的 `app.ts` 在「仅 `frontend.html`」基础上扩展：托管本包 `index.html` 与静态资源，并保留现有 `/session`、`/sse`；**路径前缀**前后端对齐。 |

---

## 6. 后续产品项（非首版必做）

- **多会话侧栏/列表**：依赖后端提供列表/分页类接口。  
- **路由**：`react-router` 等在需要深链/多页时引入。  
- **助手 Markdown**：`react-markdown` + `remark-gfm` + `rehype-sanitize` 与安全策略，见 [会话界面 v2](./会话界面/v2.md) §2～§6。  
- **测试**：Vitest + Testing Library 在业务稳定后加。  
- **TanStack Query**：GET 变复杂时评估。

---

## 7. 定稿项摘要

已确认与 **`opencode-app` 的对接**：Vite 代理到本机后端、**同域/等效同域**、**`opencode-app.sessionId`**、上述 API 与数据流、**Zustand** 在会话/SSE 中的角色、Hono 托管方案方向；不首版支持跨域 SSE + cookie 组合。

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-22 | 从原《项目工程技术选型》中拆出业务/后端与数据流、Zustand 产品内用法；工程项保留在《项目工程技术选型》。 |
