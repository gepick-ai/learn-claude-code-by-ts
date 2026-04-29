# Build Checklist (v2)

在进入 Release 前，先在本地或 CI 完成以下 Build 检查。在 [v1 Build Checklist](../v1/build/checklist.md) 的基础上，增加对 **Turborepo 编排与根脚本** 的验证；v1 中仍适用的条目（依赖安装、各包产物形态、与 Run 的边界等）不重复展开，以 v1 清单为准。

## 编排与根脚本

- [ ] **Turborepo 可解析 workspace**：根目录 `package.json` 含 `packageManager`（与当前 Bun 版本一致），`bun turbo run build` 在仓库根可执行且不报 workspace 解析错误。
- [ ] **根 `turbo.json` 存在且任务定义合理**：`build` 任务含 `dependsOn: ["^build"]` 与 `outputs`（如 `dist/**`），与仓库内实际产物目录一致。
- [ ] **全量多包构建**：根目录 **`bun build:packages`**（勿用裸 **`bun build`**）能驱动各参与包的 `build`，顺序符合依赖关系（例如构建 `@gepick/client` 时会先完成 `@gepick/sdk#build`）。
- [ ] **单包过滤构建**：`bun turbo run build --filter=@gepick/client` / `@gepick/app` / `@gepick/sdk` 等行为符合预期；必要时用 `bun turbo run build --filter=@gepick/client --dry-run` 核对任务图中是否包含应有的上游 `build`。
- [ ] **仅开发 Client 路径**：在仓库根执行 `bun install`（含 `postinstall` 全量构建）后，直接 `bun dev:client` 可启动 Vite；若曾使用 `bun install --ignore-scripts`，须先补跑 `bun build:packages`（或至少编 SDK），不应出现 `@gepick/sdk` 无法解析。

## 缓存与仓库卫生

- [ ] **`.turbo` 已忽略**：本地 Turbo 缓存目录列入 `.gitignore`，不提交到版本库。

## 文档一致性

- [ ] **`docs/development.md`**（或等价入口）与根脚本一致：`dev:client`、`dev:app`、`bun build:packages` 与按需 `bun turbo run build --filter=...` 的说明与当前仓库一致。
