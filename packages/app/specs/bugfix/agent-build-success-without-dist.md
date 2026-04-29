# RCA：Agent 显示已执行 build，但实际未产出 `client/dist`

| 字段 | 内容 |
|------|------|
| **类型** | Bug（Agent 执行反馈 / 预览可用性） |
| **严重度** | Medium（用户看到“已执行 build”，但 Code 区仍空白） |
| **影响面** | `@gepick/app` Agent 会话中 `bash` 调用 `cd client && npm run build` 的结果判定 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- Agent 在会话中回报已执行：
  - `cd client && npm install`
  - `cd client && npm run build`
- 但预览仍为空，且项目目录中没有 `client/dist/index.html`。
- 用户侧观察到“看起来执行过 build，但实际没有可预览产物”。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `npm run build` 实际经常是 **非 0 退出码**（典型是语法 / Vite 打包错误，历史上也出现过 TypeScript 链路错误）。
- 之前的 Agent 行为中，对 shell 结果“是否成功”的判定不够强制，模型容易把“命令执行过”误当成“构建成功”。

### 2.2 关联概念

- Code v4 预览入口固定为 **`client/dist/index.html`**；只要 build 失败，`dist` 就不会成为有效预览输入。
- “执行了命令”与“命令成功（exit=0）”是两件事，必须严格区分。

---

## 3. 解决思路（Resolution Strategy）

目标：让 Agent **无法忽略失败退出码**，并把“无 `dist`”直接绑定到“build 失败”。

| 方案 | 说明 |
|------|------|
| **A（采用）** | 强化 shell 返回与系统提示：非零退出码显式标红失败；prompt 要求仅 `[exit 0]` 才可宣告构建完成。 |
| B | 仅在 UI 层做“dist 不存在”提示 | 只能提示结果，不能修正 Agent 的成功判定行为，未采用。 |

---

## 4. 实施方案（Fix）

1. **`packages/app/src/agent/tools/project-shell.ts`**
   - 当命令 `exitCode !== 0` 时，在返回内容前加入显式失败横幅：
     - `COMMAND FAILED — exit code N`
     - 明确说明：`client/dist` 未产出，不可视为成功。
   - 保留统一尾部格式：`[exit N]`，供模型稳定识别。

2. **`packages/app/src/agent/tools.ts`**
   - `bash` 工具描述中明确：
     - 只有 `N=0` 才成功；
     - 非 0 需继续修复并重跑；
     - 编辑 `client/` 后必须 `cd client && npm run build` 直到 `[exit 0]`。

3. **`packages/app/src/agent/prompt.ts`**
   - 增加 `Build so preview works (mandatory)` 规则：
     - 改完 `client/` 必须 build；
     - install 缺失时先 install；
     - build 失败必须修复并重试；
     - 仅 `[exit 0]` 允许宣布“构建完成/可预览”。

4. **`packages/app/docs/design/code/v4.md`**
   - §5 与修订记录同步“改完 `client/` 后必须 build，否则无 dist”。

5. **首版模板降级为 JS/JSX（关联修复）**
   - 为降低 build 链路出错率并优先跑通新项目，`default-client` 模板首版由 TS 调整为 JS：
     - `build` 脚本由 `tsc --noEmit && vite build` 改为 `vite build`；
     - 入口改为 `src/main.jsx` / `src/App.jsx`；
     - 默认不再要求 `typescript` / `typescript-eslint`。
   - 目的不是规避失败判定，而是降低“尚未必要的 TS 编译失败”对首轮 `dist` 产出的阻塞概率。

---

## 5. 验证（Verification）

- **行为验证**：
  - 当 `npm run build` 失败时，shell 结果包含 `COMMAND FAILED` + `[exit 非0]`；
  - Agent 不应再将该状态描述为“已构建成功”。
- **正向验证**：
  - 仅当出现 `[exit 0]` 后，才认为 `client/dist` 可作为会话预览输入。
- **手工样例**：
  - 在用户 project 中触发一次失败 build（例如代码语法错误）→ 观察失败横幅；
  - 修复错误并重跑至 exit 0 → `dist` 正常产出。

---

## 6. 参考（References）

- [Code 业务区 v4](../design/code/v4.md)
- `packages/app/src/agent/prompt.ts`
- `packages/app/src/agent/tools.ts`
- `packages/app/src/agent/tools/project-shell.ts`

---

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|----------|------|
| `packages/app/src/agent/tools/project-shell.ts` | 非零退出码返回显式失败横幅，强调无 `client/dist`。 |
| `packages/app/src/agent/tools.ts` | `bash` 描述强化：仅 `[exit 0]` 成功。 |
| `packages/app/src/agent/prompt.ts` | 增补 build 必须成功（exit 0）的强约束。 |
| `packages/app/docs/design/code/v4.md` | 文档修订记录同步“改完须 build”。 |
| `packages/app/src/code/client-dev/templates/default-client/*` | 首版模板由 TS 调整为 JS/JSX，降低构建阻塞，优先保障 `dist` 可产出。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`packages/app/docs/bugfix/`*
