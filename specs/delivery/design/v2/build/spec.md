# Build (v2)

## 与 v1 的衔接

v1 已约定各包 `build` 命令、主要产物形态与「构建与运行/migration 分离」原则，见 [v1 Build 规范](../v1/build/spec.md)。v2 在**不改动各包单包构建脚本语义**的前提下，在 workspace 根引入 **Turborepo**，把「谁依赖谁、先编哪几个包」从**人工背顺序**变为**由任务图与 `^build` 自动编排**。

## 目标

- 与 v1 相同：CI 前/中稳定产出可部署物，发布与运行动作仍不混入构建阶段。
- 新增：根目录用统一任务入口表达**包间构建依赖**；本地与 CI 对「全量 / 单包」构建有一致、可复用的命令。

## 构建产物定义

与 [v1](../v1/build/spec.md) 一致，不另行重新定义：

- `@gepick/core`：`dist`
- `@gepick/sdk`：`dist`（扁平产物，不应出现 `dist/src`）
- `@gepick/client`：Vite `dist`
- `@gepick/app`：`dist/index.js` 等应用入口构建结果

## 编排层（Turborepo）的设计目的

1. **显式包间依赖**：`turbo.json` 中 `build` 任务使用 `dependsOn: ["^build"]`，使「先构建被 workspace 依赖的包、再构建当前包」成为默认规则，避免文档与脚本各写一套顺序、长期漂移。
2. **与 Bun workspaces 分工**：Bun 负责安装与 `workspace:*` 链接；Turbo 负责**多包 `build` 的调度、顺序与（本地）任务缓存**（`outputs: ["dist/**"]`），二者职责不重叠。
3. **缩小本地开发与 CI 的差距**：同一套 `bun turbo run build` / `--filter` 可在本地与流水线中使用，减少「本地能过、CI 因顺序错了挂」的情况。

## 根目录命令约定（在 v1「各包统一 `build`」之上）

根 `package.json` 暴露 **`build:packages`**（`bun turbo run build`）、`dev:app`、`dev:client`、`build:migration`、`run:migration` 等。**全量多包构建**即 **`bun build:packages`**（勿使用裸 **`bun build`**）。拓扑顺序完全由 Turbo 的 `dependsOn: ["^build"]` 解析。镜像相关命令仅保留在 `@gepick/app` 包内。
- **按包过滤**（CI 或本地只编某一包）：直接使用 `bun turbo run build --filter=@gepick/client` / `@gepick/app` 等；Turbo 仍会先执行该包在 workspace 内依赖链上的 `build`（例如构建 client 时会先完成 `@gepick/sdk#build`）。

## 与「仅开发 Client」相关的约定

`@gepick/sdk` 的 `package.json` 将入口指向 **已编译的 `dist/`**。仓库根 **`postinstall`** 会在 **`bun install`** 后执行 **`bun build:packages`**，正常情况下 SDK 产物已就绪；根脚本 **`dev:client`** 直接启动 Vite 即可。若安装时使用了 **`--ignore-scripts`** 或构建失败，需手动执行 **`bun build:packages`**（或至少 **`bun turbo run build --filter=@gepick/sdk`**）后再运行 **`dev:client`**。

## 构建阶段边界（延续 v1）

- 构建阶段只产出产物；**不**在本阶段执行 migration。
- SDK 包内 `build` 若包含从 `@gepick/app` 拉取 OpenAPI 并生成代码的步骤，仍属该包 `build` 脚本的既有行为；v2 不将其改为在 Turbo 中拆成多任务，除非后续单独发一版设计。
