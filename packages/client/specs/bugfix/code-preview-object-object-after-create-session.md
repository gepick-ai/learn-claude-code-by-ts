# RCA：创建会话后 Code 区出现 `[object Object]`

| 字段 | 内容 |
|------|------|
| **类型** | Bug（前端展示与错误归类） |
| **严重度** | Medium（创建会话后出现异常文本，干扰主流程） |
| **影响面** | `@gepick/client` 的 Code 预览区空态与错误展示 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在 Code 区尚未生成页面（工作区无可用 `index.html`）时，预期应持续展示空态文案：

`发送需求后，助手在工作区生成的页面会在这里运行。`

但实际在“新建会话”后会短时间或持续出现 `[object Object]`，用户看到的是异常字符串而不是空态提示。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `fetchWorkspacePreviewHtml()` 的异常分支对非 `Error` 异常采用 `String(e)`。
- 当 SDK / 请求链路抛出的是普通对象（非 `Error`）时，`String(e)` 会得到 `[object Object]`。
- 该字符串被写入 Code 区错误态文本，导致界面直接展示 `[object Object]`。

### 2.2 关联概念

- `@gepick/sdk` 在 `throwOnError: true` 模式下，异常类型不一定恒为原生 `Error`。
- 前端错误归类中，404（文件不存在）应映射为“missing/空态”而非“failed/错误文本”。

---

## 3. 解决思路（Resolution Strategy）

目标：避免把对象错误直接字符串化到 UI；对 404 类异常统一回退到“未生成页面”的空态分支。

| 方案 | 说明 |
|------|------|
| **A. 结构化解析异常并保留 404 归类（已采用）** | 新增错误解析函数，优先提取 `status` 与 `message/error/detail`，404 统一归类 `missing`，避免展示 `[object Object]`。 |
| B. 仅在 UI 层兜底过滤 `[object Object]` | 只能掩盖表现，无法修正错误归类链路，未采用。 |
| C. 后端改造统一错误格式 | 可做长期优化，但本次问题可在 client 侧独立修复，未采用。 |

---

## 4. 实施方案（Fix）

1. 修改 `src/code/workspace-preview.ts`：
   - 新增 `parseErrorLike(input)`，兼容 `Error` 与普通对象异常；
   - 从对象中优先读取 `status`、`message`、`error`、`detail`；
   - 避免 `String(object)` 导致 `[object Object]` 进入 UI；
   - 在 `fetchWorkspacePreviewHtml()` 中保留并强化 404 → `kind: "missing"` 的归类逻辑。

2. 修改 `src/code/code-panel.tsx`：
   - 将空态文案统一为固定句式：`发送需求后，助手在工作区生成的页面会在这里运行。`
   - 移除对应未使用状态变量，保证空态展示逻辑简洁稳定。

---

## 5. 验证（Verification）

- 手动验证：
  1) 新建会话；  
  2) 在工作区尚无可用页面时观察 Code 区；  
  3) 确认展示空态文案，不再出现 `[object Object]`。
- 异常回归：
  - 模拟 `readWorkspaceFile` 抛出对象异常（含/不含 `status`、`message`）时，不再将对象直接显示到 UI。
  - 404 类错误进入空态分支。
- 静态检查：相关文件 lint 通过。

---

## 6. 参考（References）

- `src/code/workspace-preview.ts`
- `src/code/code-panel.tsx`
- `src/code/code-store.ts`

---

## 7. 变更文件（Changelog）

| 文件 | 说明 |
|------|------|
| `src/code/workspace-preview.ts` | 新增异常对象解析与 404 稳定归类，避免 `[object Object]` 泄漏到界面 |
| `src/code/code-panel.tsx` | 统一空态文案为固定提示，并清理无用状态引用 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
