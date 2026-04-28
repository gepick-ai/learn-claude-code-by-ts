# RCA：助手回复将 `toolcall` JSON 整段当作正文展示

| 字段 | 内容 |
|------|------|
| **类型** | Bug（展示层） |
| **严重度** | Medium（用户可见内容不可读，易误解为系统故障） |
| **影响面** | `opencode-client` 会话区助手消息的 Markdown 渲染 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

助手消息气泡内出现 **大段原始 JSON**，形态类似：

`{"toolcall":[{"name":"finish","params":{"summary":"……"}}]}`

预期行为：用户应看到 **`finish` 工具参数中的 `summary` 正文**（列表、段落等），以正常 Markdown 阅读，而不是协议/中间结构。

复现：当上游模型将「可见回答」封装在上述 JSON 中、并作为 **text part** 写入会话（与 AI SDK 流式 `tool-*` 事件无对应关系）时，客户端原样把 `part.text` 交给 `MarkdownMessageBody`，界面即显示整段 JSON。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- **数据源**：助手消息的 `text` 字段承载的是 **模型自定义的结构化快照字符串**，而非面向用户的 Markdown。
- **渲染链路**：`message-transcript.tsx` 对助手 `type === "text"` 的 part 直接使用 `part.text`，未做 **按约定解包**。
- **结果**：`react-markdown` 将 JSON 当作普通文本（或落入代码样式区域），用户看到协议外壳而非 `summary`。

### 2.2 关联概念

- **工具调用在协议层 vs 模型自生成 JSON**：AI SDK 的 tool 流会映射为 `ToolPart` 等；本问题属于模型把 JSON **当作文本流**输出，客户端需 **展示层兼容** 或在上游规范化（本次采用展示层解包以降低对模型行为的强依赖）。

---

## 3. 解决思路（Resolution Strategy）

目标：在 **不破坏正常 Markdown/JSON 讨论** 的前提下，当且仅当 **整段内容可解析为带 `toolcall` 数组且含 `finish.params.summary`** 时，提取 `summary` 作为展示正文。

| 方案 | 说明 |
|------|------|
| **A. 客户端解包展示（已采用）** | 新增纯函数：去可选 ` ```json ` 围栏后 `JSON.parse`，识别 `toolcall` + `finish` + `summary`，拼接多条 `summary`；否则退回原文。 |
| B. 仅在 `opencode-app` 落库前改写 | 需与所有消费端对齐，且流式中间态更难统一；本次未采用。 |
| C. 完全依赖模型改为标准 tool 流 | 长期理想态，短期无法保证所有模型行为。 |

---

## 4. 实施方案（Fix）

1. 新增 `src/session/chat/unwrap-toolcall-display-text.ts`，导出 `unwrapToolcallDisplayText(raw: string)`：
   - 支持外层 Markdown 代码围栏（`json` 可选）；
   - 仅当解析结果为对象且存在 `toolcall` 数组时继续处理；
   - 收集 `name === "finish"` 且 `params.summary` 为非空字符串的项，以 `\n\n` 连接；
   - 解析失败或没有可用 `summary` 时 **返回原始 `raw`**，避免误伤。

2. 修改 `src/session/chat/message-transcript.tsx`：对 **助手** 的 text part，将 `MarkdownMessageBody` 的 `content` 从 `part.text` 改为 `unwrapToolcallDisplayText(part.text)`。

用户消息与其它 part 类型不变。

---

## 5. 验证（Verification）

- 手动：发送会触发「整段 `toolcall` JSON 文本」的回复，确认气泡内为 `summary` 的可读正文（含换行与列表），而非原始 JSON。
- 回归：普通 Markdown 助手回复、用户消息显示正常。
- 命令：`apps/opencode-client` 下执行 `./node_modules/.bin/tsc --noEmit` 通过。

---

## 6. 参考（References）

- 展示入口：`src/session/chat/message-transcript.tsx`
- Markdown 组件：`src/session/chat/markdown-message-body.tsx`
- 服务端文本落库与流式：`apps/opencode-app/src/agent/processor.ts`（`text-delta` / `text-end`）

---

## 7. 变更文件（Changelog）

| 文件 | 说明 |
|------|------|
| `src/session/chat/unwrap-toolcall-display-text.ts` | 新增：`toolcall` / `finish` / `summary` 解包逻辑 |
| `src/session/chat/message-transcript.tsx` | 助手 text 渲染前调用 `unwrapToolcallDisplayText` |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
