# @gepick/app

基于 Bun + Hono + Drizzle（SQLite）的服务端应用。

## 启动项目

下面步骤按“可直接跑起来”写，默认你当前在仓库根目录 `gepick`（monorepo 根 `package.json` 的 `name`）。

### 1) 安装依赖

```bash
bun install
```

### 2) 数据库启动

在仓库根目录执行以下步骤：

1) 同步 schema 到本地 SQLite（开发推荐），在仓库根目录：

```bash
bun -F '@gepick/app' db:push
```

（若在 `packages/app` 目录内，可直接 `bun db:push`。）

2) 需要提交版本化迁移时，在仓库根目录生成 migration 文件：

```bash
bun build:migration
```

（等价于在 `packages/app` 内执行 `bun db:generate`。）

3) 验证数据库表是否已创建：

```bash
sqlite3 .data/app.db ".tables"
```

4) 将 `migration/` 下未应用的迁移执行到本地库（开发常用源码入口，在仓库根）：

```bash
bun run:migration
```

（等同 `bun -F '@gepick/app' migrate:apply`；若已 `build` 并要用 `dist/migrate.js`，则 `bun -F '@gepick/app' migrate`。）

### 3) 设置运行环境变量

至少要有模型 ID：

```bash
export MODEL_ID=claude-3-5-haiku-latest
```

并设置对应 provider 的 key（例如 Anthropic）：

```bash
export ANTHROPIC_API_KEY=你的key
```

### 4) 启动服务

在仓库根目录：

```bash
bun dev:app
```

或在 `packages/app` 内：

```bash
bun src/index.ts
```

启动成功后监听：

- `http://localhost:3000`

### 5) 快速验证

创建 session：

```bash
curl -s -X POST http://localhost:3000/session
```

发送消息（替换 `<sessionId>`）：

```bash
curl -s -X POST "http://localhost:3000/session/<sessionId>/message" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      { "type": "text", "text": "你好" }
    ]
  }'
```

如果启动时报 `EADDRINUSE`，说明 `3000` 端口已占用，先停掉占用进程再重启。

## 主要接口

- `POST /session`：创建会话
- `GET /session/:sessionId`：获取会话信息
- `POST /session/:sessionId/message`：发送消息并触发处理
- `GET /session/:sessionId/message`：获取会话消息

## 业务说明

### SSE 订阅

```bash
curl -N http://localhost:3000/sse/event
```

常见事件：

- `server.connected`
- `server.heartbeat`
- `session.part.updated`
- `session.part.delta`
