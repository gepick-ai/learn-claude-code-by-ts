# RCA：Vite 代理 `socket hang up` 导致会话界面不可用

| 字段 | 内容 |
|------|------|
| **类型** | Bug（开发环境） |
| **严重度** | High（核心会话流程被中断，页面无法正常打开/使用） |
| **影响面** | `@gepick/client` 会话页、`/session/:id/message` 拉取与发送后刷新链路 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- 前端发送消息后，控制台/终端出现 Vite 代理错误：
  - `[vite] http proxy error: /session/ses_xxx/message`
  - `Error: socket hang up`
- 同时伴随 HMR 更新日志，随后会话界面出现异常，表现为无法正常打开或消息区不可用。
- 在问题出现时，用户主观感知为「前端界面突然炸掉」。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- 开发环境下 API 走相对路径，先进入 Vite `server.proxy` 再转发到 `@gepick/app`。
- 在 `GET /session/:sessionId/message` 这类响应体较大或连接时序敏感的请求上，Node `http-proxy` 偶发中途断开，报 `socket hang up`。
- 一旦该链路断开，前端消息加载与状态恢复失败，造成页面可用性明显下降。

### 2.2 关联概念

- 本次问题不等价于后端接口不可用：直连 `@gepick/app` 时同一路由可稳定返回 200。
- 问题集中在「开发代理层」，不是业务 API 本身的语义错误。

## 3. 解决思路（Resolution Strategy）

目标：在开发环境优先保证会话链路稳定，避免受 Vite 代理偶发断连影响。

| 方案名 | 说明 |
|------|------|
| 方案 A（采用） | 开发态默认直连 `@gepick/app`（`http://127.0.0.1:3000`），仅在显式配置 `VITE_GEPICK_DEV_API_ORIGIN` 时覆盖。 |
| 方案 B | 继续依赖 Vite proxy，并调大 timeout / proxyTimeout。历史上仍可能出现断连，稳定性不足。 |

## 4. 实施方案（Fix）

- 修改 `packages/client/src/util/api-base.ts`：
  - `DEV` 环境下若未设置 `VITE_GEPICK_DEV_API_ORIGIN`，默认返回 `http://127.0.0.1:3000`；
  - 不再返回空字符串触发相对路径代理转发。
- 这样 `fetch` / SDK 请求会直接访问 app 服务，绕开 Vite 代理链路，减少 `socket hang up`。

## 5. 验证（Verification）

- 重启 `@gepick/client` 开发服务后验证：
  1. 打开会话页面并发送用户消息；
  2. 观察不再出现 `[vite] http proxy error ... socket hang up`；
  3. `GET /session/:sessionId/message` 正常返回，界面可持续渲染消息。
- 交叉验证：
  - 直连 `http://127.0.0.1:3000/session/:sessionId/message` 返回 200，确认后端接口可用。

## 6. 参考（References）

- `packages/client/src/util/api-base.ts`
- `packages/client/vite.config.ts`
- `packages/client/src/session/session-api.ts`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `packages/client/src/util/api-base.ts` | 开发环境默认 API base 改为直连 `http://127.0.0.1:3000`，避免走 Vite 代理。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
