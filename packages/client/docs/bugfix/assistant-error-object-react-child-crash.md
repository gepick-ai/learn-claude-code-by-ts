# RCA：助手错误对象直渲染导致 React child 崩溃

| 字段 | 内容 |
|------|------|
| **类型** | Bug（前端渲染异常） |
| **严重度** | High（会话面板运行时抛错，中断消息区域渲染） |
| **影响面** | `@gepick/client` 会话消息区 `MessageTranscript` 中 assistant 错误展示 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- 控制台报错：
  - `Objects are not valid as a React child (found: object with keys {name, data})`
- 伴随提示：
  - `An error occurred in the <p> component`
- 触发场景：assistant 消息携带结构化错误对象（例如 `APIError`）时，会话区崩溃或异常显示。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `message-transcript.tsx` 中 assistant 错误渲染为：
  - `<p>{message.error}</p>`
- 但 `message.error` 在 SDK 类型里可能是对象联合（如 `{ name, data }`），并非可直接渲染的 React child。

### 2.2 关联概念

- `@gepick/sdk` 的 `AssistantMessage.error` 是结构化错误联合类型，不是字符串。
- React 仅接受字符串/数字/元素/数组作为 child，普通对象会直接抛错。

---

## 3. 解决思路（Resolution Strategy）

目标：在 UI 层统一把 assistant 错误对象转换为可读字符串，避免任何对象直渲染。

| 方案 | 说明 |
|------|------|
| **A（采用）** | 新增 `formatAssistantError(error)`，提取 `data.message` / 解析 `responseBody` / 兜底 `JSON.stringify`，再渲染字符串。 |
| B | 在 store/API 层把错误统一改成字符串 | 影响范围更大，且会丢结构化信息，未采用。 |

---

## 4. 实施方案（Fix）

1. 修改 `packages/client/src/session/chat/message-transcript.tsx`：
   - 新增 `formatAssistantError(error: unknown): string`
   - 渲染由 `<p>{message.error}</p>` 改为 `<p>{formatAssistantError(message.error)}</p>`
2. 提取策略：
   - `string` 直接返回
   - `Error` 返回 `message`
   - 对象优先取 `error.data.message`
   - 若存在 `error.data.responseBody`，尝试解析 JSON 的 `error.message`
   - 最后兜底 `JSON.stringify(error)`

---

## 5. 验证（Verification）

- 使用包含 `{ name: "APIError", data: {...} }` 的 assistant 错误消息进行渲染：
  - 不再触发 React child 对象崩溃
  - 页面稳定展示错误文本
- 旧路径（字符串错误）仍正常显示。

---

## 6. 参考（References）

- `packages/client/src/session/chat/message-transcript.tsx`
- `packages/sdk/src/gen/types.gen.ts`（`AssistantMessage.error` 联合类型）

---

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|----------|------|
| `packages/client/src/session/chat/message-transcript.tsx` | 增加错误格式化函数，避免对象直渲染导致崩溃。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`packages/client/docs/bugfix/`*
