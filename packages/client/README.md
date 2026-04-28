# @gepick/client

Vite + React + Tailwind CSS v4 前端包。工程约定见 [docs/项目工程技术选型.md](./docs/design/项目工程技术选型.md)，与后端的对接见 [docs/与-gepick-app-配套对接说明.md](./docs/design/与-gepick-app-配套对接说明.md)。

## 开发

在仓库根目录：

```bash
bun run dev:client
```

或：

```bash
bun run -F '@gepick/client' dev
```

本包目录下可拷贝 `.env.example` 为 `.env`，设置 **`GEPICK_APP_ORIGIN`** 指向本机 `@gepick/app`（见 Vite 代理配置）。

## 构建与检查

```bash
bun run build:client
bun run -F '@gepick/client' lint
bun run -F '@gepick/client' format:check
```
