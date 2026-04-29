# RCA：Agent 在 `client/` 下仍按「HTML + 根目录脚本」扩展，未按 Vite 工程结构写码

| 字段 | 内容 |
|------|------|
| **类型** | Bug（产品行为 / Agent 引导） |
| **严重度** | Medium（与 Code v4「`client/` 为 Vite+React+TS 工程」不一致，预览与维护成本上升） |
| **影响面** | 绑定 project 的 Agent 会话中，对 `client/` 的 `write_file` / 内容组织方式 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- 工作区已能 **`ensureCodeWorkspace` 下落 `client/` 模板**（含 `package.json`、`vite.config.ts`、`src/` 等）。
- 但 Agent 仍常见以下写法，等价于「单页静态站」心智，而非工程化 **`src/` 入口 + 构建**：
  - 在 **`client/index.html`** 内嵌大段逻辑，或使用 **`cdn.tailwindcss.com`** 等 CDN 脚本代替工具链 Tailwind；
  - 在 **`client/` 根目录**创建 **`game.js`**（或其它大型 `*.js`），与 `package.json` 并列，作为主应用逻辑载体；
  - 未优先把功能放进 **`client/src/**/*.tsx`** 并从 **`main.tsx` → `App.tsx`** 组织。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- Code v4 落地后，**system prompt** 虽说明「应用在 `client/`、`npm run build`、预览 `client/dist`」，但 **未强制目录与分层约定**，模型默认沿用训练中最省事的 **HTML-first + 散脚本** 模式。

### 2.2 关联概念

- v4 产品标准是 **`package.json` 为纲、源码在 `client/src/`、根 `index.html` 仅为 Vite 壳**，见 [Code 业务区 v4](../design/code/v4.md)。
- **工具描述**若未点名「勿在 `client/` 根写主逻辑 `.js`」，仅靠短提示不足以覆盖强习惯。

---

## 3. 解决思路（Resolution Strategy）

目标：在不改 Agent 工具协议的前提下，通过 **契约级 system prompt + `write_file`/`bash` 描述** 把默认路径锁到 **Vite 工程结构**。

| 方案 | 说明 |
|------|------|
| **A（采用）** | 扩充 `buildSystemPrompt`：新增 *How to lay out `client/`*，明确 **`client/src/`**、`index.html` 薄壳、禁止根目录 **`client/*.js`** 承载主逻辑、Tailwind 走 **`@tailwindcss/vite` + `src/index.css`**。 |
| **B** | 在 `write_file` 内硬编码路径黑名单（如拒绝 `client/game.js`） | 易误杀 `public/`、临时文件；本次未采用，保留为后续可选。 |

---

## 4. 实施方案（Fix）

1. **`packages/app/src/agent/prompt.ts`**  
   - 增加 **mandatory** 小节：源码在 **`client/src/`**，入口 **`main.tsx` → `App.tsx`**；**`client/index.html`** 仅保留 Vite module 入口；**禁止**用根目录 **`client/*.js`** 作为主代码库；Tailwind **禁止默认 CDN script**。
2. **`packages/app/src/agent/tools.ts`**  
   - `bash`：注明 **cwd 为工作区根**，npm/vite 使用 **`cd client && …`**。  
   - `write_file`：注明对 **`client/`** 须遵循 Vite 布局，**不要用 `client/` 根部的杂散 `*.js` 做主应用逻辑**。
3. **`packages/app/docs/design/code/v4.md`**  
   - §5 Agent 边界补充上述结构要求，并与修订记录对齐。

---

## 5. 验证（Verification）

- **逻辑**：新会话加载更新后的 system prompt 与工具描述后，Agent 应在指令中偏向 **`client/src/`** 与组件化实现。
- **回归**：不改变 project 工具路径校验、不改变 bash **`cwd`**（仍为工作区根）；仅文案与契约增强。
- **已知限制**：**已生成**的旧会话/旧文件不会自动重写；用户可新开会话或明确要求「迁移到 `src/`」。

---

## 6. 参考（References）

- [Code 业务区 v4](../design/code/v4.md)
- `packages/client/docs/design/code/v4.md`（宿主预览入口 `client/dist/index.html`）

---

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|----------|------|
| `packages/app/src/agent/prompt.ts` | 增补 Code v4 下 **`client/` 目录与代码风格** 强制约定。 |
| `packages/app/src/agent/tools.ts` | `bash` / `write_file` 描述对齐 **`cd client`** 与 **Vite `src/`** 心智。 |
| `packages/app/docs/design/code/v4.md` | §5 Agent 边界与修订记录同步。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`packages/app/docs/bugfix/`*
