# selfhost 使用说明

本文档说明如何使用 `/.docker/selfhost` 下的 Compose 配置启动 `gepick`。

## 文件说明

- `compose.yml`：通用运行配置（端口、卷、环境变量、migration 依赖）。
- `compose.local.yml`：本地开发覆盖配置（使用 Dockerfile 本地构建镜像）。
- `.env.example`：环境变量模板。
- `.env`：本地实际环境变量。

## 启动前准备

在 `/.docker/selfhost` 目录执行：

1. 复制环境变量模板：
   - `cp .env.example .env`
2. 按需修改 `.env`（至少确认以下项）：
   - `PORT`
   - `APP_IMAGE`（必填，指向你当前仓库发布的镜像）
   - `HOST_DB_PATH`
   - `HOST_PROJECT_PATH`
   - `APP_DB_PATH`
   - `APP_PROJECT_PATH`
   - `MODEL_ID` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY`

## 运行模式

### 1) 远端镜像模式（用户默认）

直接使用仓库镜像启动：

- `docker compose up -d`

说明：
- 使用 `compose.yml`；
- `APP_IMAGE` 必须在 `.env` 中显式配置（例如 `ghcr.io/<your-org>/gepick:latest`）。

### 2) 本地构建模式（开发调试）

使用本地 Dockerfile 构建并启动：

- `docker compose -f compose.yml -f compose.local.yml up --build`

说明：
- `compose.local.yml` 只覆盖 `build`；
- 运行时配置仍来自 `compose.yml`（包括 migration、卷挂载、端口、env_file）。

## migration 与 app 启动关系

`compose.yml` 中包含两个服务：

- `gepick_migration`：一次性迁移服务，执行 `bun migrate.js`
- `gepick`：主服务，依赖 `gepick_migration` 成功后启动

即：先迁移，再启动应用。
