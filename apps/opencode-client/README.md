# @agent-dev/opencode-client

Vite + React + Tailwind CSS v4 前端包。工程约定见 [docs/项目工程技术选型.md](./docs/项目工程技术选型.md)，与后端的对接见 [docs/与-opencode-app-配套对接说明.md](./docs/与-opencode-app-配套对接说明.md)。

## 开发

在仓库根目录：

```bash
bun run dev:opencode-client
# 或
bun run -F @agent-dev/opencode-client dev
```

本包目录下可拷贝 `.env.example` 为 `.env`，设置 `OPENCODE_APP_ORIGIN` 指向本机 `opencode-app`（见 Vite 代理配置）。

## 构建 / 检查

```bash
bun run build:opencode-client
bun run -F @agent-dev/opencode-client lint
bun run -F @agent-dev/opencode-client format:check
```
