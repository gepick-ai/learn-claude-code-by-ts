# RCA：会话生成阶段“已完成”但文件写入与预览产物不一致

| 字段 | 内容 |
|------|------|
| **类型** | Bug（selfhost 会话生成链路） |
| **严重度** | High（用户看到“已完成”，但实际预览白屏/报错，影响核心体验） |
| **影响面** | `@gepick/app` Agent 工具调用、工作区写入、`client/dist` 预览链路 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在 selfhost 场景中，用户发起“生成页面/小游戏”后出现以下异常组合：

1. 对话侧显示“已完成、已执行构建命令”，但实际页面无变化或白屏。
2. 浏览器控制台出现运行时错误（如 `food is not defined`）或资源请求异常。
3. 部分项目的 `client/dist/index.html` 仍是占位页，或引用 `/src/main.jsx` 等非生产入口。
4. 右侧工具日志中某些工具状态为 `completed`，但看不到有效输出细节，难以判断是否真实成功。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- Agent 在部分轮次把 `write_file` 路径传成绝对路径（如 `/app/.projects/...`）；旧路径守卫对绝对路径直接拒绝，导致“意图写入”和“真实写入”存在偏差。
- 工具结果持久化时写成了 `evt.output.output`，使真实工具输出丢失（UI 里只看到 `None`），造成“看起来成功”的错觉。
- 运行镜像缺少 `node/npm`，导致 `cd client && npm run build` 失败；失败后模型可能尝试直接改写 `client/dist`，引入伪产物。
- 历史项目中残留无效 `dist`（占位页或 `/src/*` 入口），预览链路会继续消费这些坏产物。

### 2.2 关联概念

- `client/dist` 是构建产物目录，必须由构建命令生成，不应作为源码编辑目标。
- “工具执行状态可观测性”是 Agent 工作流可靠性的前提；否则用户无法区分“命令成功”与“命令失败后被掩盖”。

## 3. 解决思路（Resolution Strategy）

目标：保证“写入-构建-预览”链路一致，失败可见、成功可证，避免假成功与白屏。

| 方案 | 说明 |
|------|------|
| 方案 A（采用） | 修复路径守卫、工具输出记录、容器构建依赖，并禁止 `client/dist` 被工具写入；再加预览入口有效性防呆。 |
| 方案 B | 保持现状仅靠提示词约束模型行为；风险高，无法兜底历史坏产物与工具输出缺失。 |

## 4. 实施方案（Fix）

1. **路径守卫兼容绝对路径（仅限项目根内）**  
   - 文件：`packages/app/src/code/path-guard.ts`  
   - 行为：绝对路径若位于当前 `absoluteProjectDir` 内则放行；项目外绝对路径仍拒绝。

2. **修复工具结果持久化字段**  
   - 文件：`packages/app/src/agent/processor.ts`  
   - 将 `tool-result` 记录由 `evt.output.output` 改为 `evt.output`，保留真实执行输出。

3. **禁止工具写入构建产物目录**  
   - 文件：`packages/app/src/agent/tools/project-fs.ts`  
   - 对 `client/dist/**` 的 `write_file`/`edit_file` 返回明确错误，强制“改 `client/src` + 构建”路径。

4. **增强 Agent 规则约束**  
   - 文件：`packages/app/src/agent/prompt.ts`  
   - 明确加入“禁止编辑 `client/dist`”。

5. **补齐运行时构建依赖**  
   - 文件：`.docker/deployment/app/Dockerfile`  
   - 安装 `nodejs npm`，确保 `npm run build` 在容器内可执行。

6. **预览入口防呆校验**  
   - 文件：`packages/app/src/code/preview/read-workspace-preview.ts`  
   - 对 `client/dist/index.html` 增加校验：命中占位页或 `/src/*` 入口时返回明确诊断页，避免白屏。

7. **历史项目产物回归修复**  
   - 对 `~/.gepick/self-host/projects/prj_*` 下各 `client` 重新执行构建，清理历史坏 `dist`。

## 5. 验证（Verification）

1. 环境验证：
   - 重建并启动 selfhost 后，`gepick_server` 正常启动，`gepick_migration` 正常完成。
2. 工具链验证：
   - 新会话中 `write_file` 可真实写入项目文件（含绝对路径场景）；
   - 工具输出可见（不再是 `None`）。
3. 构建验证：
   - `npm run build` 可在容器中执行，`client/dist` 生成 `assets/*.js` 与 `assets/*.css`。
4. 防呆验证：
   - 若 `dist/index.html` 为占位页或引用 `/src/*`，预览返回“可读诊断页”而非白屏。
5. 页面验证：
   - 创建项目/会话后预览可正常加载；历史项目切换时不再随机命中坏产物。

## 6. 参考（References）

- `packages/app/src/code/path-guard.ts`
- `packages/app/src/agent/processor.ts`
- `packages/app/src/agent/tools/project-fs.ts`
- `packages/app/src/agent/prompt.ts`
- `packages/app/src/code/preview/read-workspace-preview.ts`
- `.docker/deployment/app/Dockerfile`
- `.docker/selfhost/compose.yml`
- `.docker/selfhost/compose.local.yml`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `packages/app/src/code/path-guard.ts` | 允许项目根内绝对路径，拒绝项目外绝对路径，修复写入路径兼容性。 |
| `packages/app/src/agent/processor.ts` | 修复 tool output 记录字段，恢复工具执行结果可观测性。 |
| `packages/app/src/agent/tools/project-fs.ts` | 禁止写/改 `client/dist/**`，避免伪造构建产物。 |
| `packages/app/src/agent/prompt.ts` | 强化规则：禁止编辑 `client/dist`。 |
| `.docker/deployment/app/Dockerfile` | 补装 `nodejs npm`，保障容器内构建可用。 |
| `packages/app/src/code/preview/read-workspace-preview.ts` | 增加 `dist/index.html` 有效性校验与诊断页兜底。 |
| `specs/delivery/bugfix/session-agent-write-preview-consistency.md` | 新增本次 RCA 文档。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`specs/delivery/bugfix/`*
