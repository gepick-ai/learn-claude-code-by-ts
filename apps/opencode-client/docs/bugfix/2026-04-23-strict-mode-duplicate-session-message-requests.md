# RCA：开发态下 `GET /session` 与 `GET .../message` 重复请求

| 字段 | 内容 |
|------|------|
| **类型** | Bug / Regression（开发环境） |
| **严重度** | Low（功能正确，多余网络与负载） |
| **影响面** | `opencode-client` 首次进入会话页时的初始化请求 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在浏览器 Network 面板中，页面加载时 **`/session`（列表）** 与 **`/session/:id/message`（消息）** 各出现 **两次** 相同请求，复现于 **React 18 开发模式**（带 `StrictMode`）。

生产构建若未包裹 `StrictMode`，通常只发一次（与预期一致）。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

`SessionHistoryPanel` 在 `useEffect`（`[]` 依赖）中调用 `useSessionStore.getState().hydrate()`。

`hydrate` 内部在设置 `hydrated: true` **之前** 存在 `await sessionApi.listSessions()` 等异步边界。  
在 **React 18 StrictMode** 下，开发环境会 **故意双次挂载** 子树以暴露不安全的副作用：

1. 第一次 `useEffect` 执行 → 进入 `hydrate` → `hydrated === false` 通过 → 发起 `listSessions`，在 **第一个 `await` 挂起**；
2. React 模拟卸载再挂载，**第二次** `useEffect` 执行 → 此时第一次请求尚未把 `hydrated` 置为 `true` → 再次通过校验 → **重复发起整段初始化**（含后续的 `loadMessages`）。

因此属于 **竞态（race）** + **副作用在 async 完成前缺少单飞（single-flight）保护**。

### 2.2 关联概念

- **StrictMode double mount**：仅开发态行为，用于辅助发现副作用问题，[官方文档](https://react.dev/reference/react/StrictMode) 有说明。
- **Single-flight / request deduplication**：同一逻辑若可能被并发触发，应共享同一次 in-flight Promise 或等价互斥，避免重复 I/O。

---

## 3. 解决思路（Resolution Strategy）

目标：无论 `hydrate` 被同步调用多少次，**在尚未完成初始化时只跑一条请求链**。

可选方向：

| 方案 | 说明 |
|------|------|
| **A. 模块级 in-flight Promise（已采用）** | 与仓库内 `sessionSseClient` 对 SSE 的处理一致：若已有 `hydrate` 在执行，后续调用 `return` 同一 `Promise`。 |
| B. 同步置“占用”标志 | 在首个 `await` 前 `set({ hydrating: true })`，需与 zustand 更新顺序配合，避免双调用同 tick 竞态。 |
| C. 移除根节点 `StrictMode` | 掩盖问题，不推荐作为唯一手段；不利于发现其他副作用问题。 |

---

## 4. 实施方案（Fix）

在 `apps/opencode-client/src/session/store/sessionStore.ts` 中：

- 增加模块级变量 `hydrateInFlight: Promise<void> | null`。
- `hydrate` 内：若 `get().hydrated` 已为 `true` 则直接 return；若 `hydrateInFlight` 存在则 **return 该 Promise**；否则创建新的 async IIFE 赋值给 `hydrateInFlight`，在 `finally` 中置回 `null`。

这样第二次 `useEffect` 会等待（或复用）同一次初始化，**不再重复** `listSessions` 与 `loadMessages`。

---

## 5. 验证（Verification）

- 开发环境：硬刷新会话页，Network 中 `GET /session` 与当前会话的 `GET .../message` 各 **1 次**。
- `npx tsc --noEmit` 通过。

---

## 6. 参考（References）

- 同仓库防 StrictMode 重复连接的前例：`src/session/sse/sessionSseClient.ts`（`useSessionSse` 配套说明）。
- React `StrictMode` 与双次 `useEffect` 行为：以当前项目使用的 React 18 官方文档为准。

---

## 7. 变更文件（Changelog）

| 文件 | 说明 |
|------|------|
| `src/session/store/sessionStore.ts` | 为 `hydrate` 增加 `hydrateInFlight` 单飞逻辑 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/rca/`*
