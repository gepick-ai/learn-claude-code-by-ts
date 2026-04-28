# RCA：`iframe sandbox` 限制导致代码区游戏无法交互

| 字段 | 内容 |
|------|------|
| **类型** | Bug（开发环境） |
| **严重度** | High（代码业务区核心验收场景“可玩”失效） |
| **影响面** | `@gepick/client` 的 `session` 槽位代码运行区（`code-panel`） |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- 用户在会话中生成贪吃蛇 HTML 后，界面可以渲染，但按钮、键盘、触摸交互都无法正常驱动游戏。
- 具体表现为“看得到 UI，无法开始/操作游戏”，不满足 `code v1` 的可交互闭环目标。
- 同一份 HTML 在普通页面可运行，在 `session slot` 的 iframe 中失效。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `code-panel` 使用了受限 sandbox：
  - `sandbox="allow-scripts allow-forms allow-modals"`
- 该配置缺少 `allow-same-origin`，导致 iframe 内脚本访问 `localStorage` 时触发安全异常。
- 贪吃蛇脚本在初始化阶段执行 `localStorage.getItem('snakeHighScore')`，异常后后续事件绑定链路中断，最终表现为不可交互。

### 2.2 关联概念

- 在沙箱 iframe 中，若未显式开启 `allow-same-origin`，文档会被视为唯一来源（opaque origin），Web Storage 等同源能力会被限制。
- 本问题并非 HTML 提取失败，而是“运行时环境权限不足”引发的脚本早期中断。

## 3. 解决思路（Resolution Strategy）

目标：在不放开不必要权限的前提下，使常见前端小游戏（依赖 `localStorage`）可正常运行与交互。

| 方案名 | 说明 |
|------|------|
| 方案 A（采用） | 在 iframe sandbox 中补充 `allow-same-origin`，保留 `allow-scripts/allow-forms/allow-modals`。 |
| 方案 B | 保持现状，让生成代码规避 `localStorage`。该方案对模型输出约束过强，稳定性不足。 |
| 方案 C | 移除 sandbox。安全边界过宽，不采用。 |

## 4. 实施方案（Fix）

- 修改 `packages/client/src/code/code-panel.tsx` 中 iframe 的 sandbox：
  - 从 `allow-scripts allow-forms allow-modals`
  - 调整为 `allow-scripts allow-forms allow-modals allow-same-origin`
- 保持其余渲染、reload、按 `sessionId` 回显逻辑不变，最小改动修复交互可用性。

## 5. 验证（Verification）

- 手动验证步骤：
  1. 在会话中请求生成贪吃蛇 HTML；
  2. 确认 `slot` 中游戏界面渲染；
  3. 点击“开始游戏”按钮，观察蛇开始移动；
  4. 使用方向键/屏幕按钮/触摸滑动，确认方向变更生效。
- 回归检查：
  - `code-panel` 的 empty/ready/error 状态切换保持正常；
  - `ReadLints` 对改动文件无新增错误。

## 6. 参考（References）

- `packages/client/src/code/code-panel.tsx`
- `packages/client/src/code/extract-html-from-message.ts`
- `packages/client/docs/design/code/v1.md`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `packages/client/src/code/code-panel.tsx` | 为代码运行 iframe 增加 `allow-same-origin`，修复依赖 `localStorage` 的交互脚本无法运行问题。 |
| `packages/client/docs/bugfix/iframe-sandbox-blocks-game-interaction.md` | 新增本次问题 RCA 文档。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
