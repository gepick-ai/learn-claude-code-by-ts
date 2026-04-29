# Build (v1)

## 目标

在 CI 前与 CI 中都能稳定产出可部署物，不把发布动作和运行动作混入构建阶段。

## 构建产物定义

- `@gepick/core`：`dist`（可供其他包消费）
- `@gepick/sdk`：`dist`（扁平产物，不应出现 `dist/src`）
- `@gepick/client`：Vite `dist`（静态资源）
- `@gepick/app`：`dist/index.js`（应用运行入口构建结果）

## 构建顺序

1. 安装依赖（workspace 根目录）
2. 构建 `@gepick/core`
3. 构建 `@gepick/sdk`
4. 构建 `@gepick/client`
5. 构建 `@gepick/app`

## 构建命令约定

- 各包统一使用 `build` 命令。
- workspace 根目录可提供聚合命令（例如 **`bun build:packages`**（`bun turbo run build`）、`bun build:migration` / `bun run:migration` 等，以当前根 `package.json` 为准）；根脚本调用约定 **`bun <脚本名>`**；勿使用裸 **`bun build`**（Bun 自带的 bundle 子命令）。镜像相关脚本仅放在 `@gepick/app` 包内。单包构建可直接使用 `bun turbo run build --filter=@gepick/...`。
- 构建阶段只产出产物，不执行 migration。
