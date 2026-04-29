# RCA：selfhost 启动阶段 migration 路径错误与前端资源 MIME 异常

| 字段 | 内容 |
|------|------|
| **类型** | Bug（selfhost 运行阶段） |
| **严重度** | High（容器启动链路阻断，前端页面不可用） |
| **影响面** | `/.docker/selfhost` 启动流程、`@gepick/app` 容器运行、`localhost:3000` 前端加载 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在本地执行 `docker compose -f compose.yml -f compose.local.yml up -d --build` 后：

1. `gepick_migration` 容器退出码为 1，`gepick` 因 `depends_on` 无法进入稳定启动。
2. 日志出现 `EACCES: permission denied, mkdir '/migration'`。
3. 浏览器访问 `http://localhost:3000` 时，控制台报错（先后出现两种）：
   - `Failed to load module script: ... MIME type "text/html"`；
   - `Failed to load module script: ... MIME type of ""`（空 `Content-Type`）。
4. 表象上看是前端资源问题，但实际前置失败点在 migration 容器路径解析与构建产物一致性。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- 容器镜像采用扁平 `/app` 目录（`dist` 内容直接拷贝到 `/app`），但应用中数据库与 migration 根路径推导仍依赖旧目录层级假设，导致 `migrationDir` 被解析到 `/migration`，触发权限错误。
- 在修复代码后，若未重新构建 `packages/app/dist`，容器仍会运行旧版 `migrate.js`，继续触发旧错误。
- migration 容器失败后，前端静态资源请求链路异常，导致模块脚本请求拿到 HTML 回退内容，出现 MIME 报错。
- 在迁移链路恢复后，`packages/app/src/server/app.ts` 中静态文件响应使用 `new Response(file)`，在当前运行环境下 `Bun.file(...).type` 对部分资产可能返回空字符串，导致 `Content-Type` 为空并触发浏览器对 module script 的严格 MIME 校验失败。

### 2.2 关联概念

- **运行路径与构建产物一致性**：Docker 运行布局变更后，凡使用 `import.meta.url` 做相对路径推导的逻辑都需要同步校准。
- **迁移与运行分离**：`gepick_migration` 作为 one-shot 服务正确，但其入口脚本必须与最新 dist 同步。

## 3. 解决思路（Resolution Strategy）

目标：在保持容器扁平 `/app` 约定的前提下，保证 migration 与 app 启动路径解析稳定，并恢复前端静态资源正确加载。

| 方案 | 说明 |
|------|------|
| 方案 A（采用） | 保持 `/app` 扁平布局，修改应用路径解析逻辑以兼容扁平/源码目录，并在每次变更后重建 app dist。 |
| 方案 B | 改回 `/app/dist` 目录运行，减少代码改动，但不符合当前部署约定。 |

## 4. 实施方案（Fix）

1. **迁移与启动职责拆分**  
   - 在 `packages/app/src/storage/db.ts` 中移除 `Database.Client()` 内的自动迁移。  
   - 新增 `Database.runMigrations()`，由独立入口调用。  
   - 新增 `packages/app/src/migrate.ts` 作为 one-shot migration 入口。

2. **构建产物补齐**  
   - `packages/app/package.json` 的 `build` 脚本同时产出 `dist/index.js` 与 `dist/migrate.js`。

3. **路径解析兼容扁平 `/app`**  
   - `packages/app/src/storage/db.ts` 使用候选目录探测 `migration` 根目录，兼容不同运行布局。  
   - `packages/app/src/env.ts` 改为多候选 `.env` 路径探测，避免单一路径假设。

4. **selfhost 运行编排修正**  
   - `/.docker/selfhost/compose.yml` 保持 `gepick_migration` 在 `gepick` 前执行，命令为 `bun migrate.js`。  
   - `gepick` 依赖 `gepick_migration` 成功完成后再启动。

5. **静态资源 MIME 显式设置（第二轮修复）**  
   - 在 `packages/app/src/server/app.ts` 为静态文件响应增加 `Content-Type` 回退策略：优先 `file.type`，为空时按扩展名映射（`.js/.mjs` -> `text/javascript`，`.css` -> `text/css`，`.html` -> `text/html` 等）。  
   - 避免浏览器拿到空 MIME 导致 module script 被拦截。

6. **项目模板目录补齐（第三轮修复）**  
   - `POST /project` 会调用 `ensureCodeWorkspace()`，并从 `templates/default-client` 复制初始化模板。  
   - 容器镜像仅拷贝了 `dist/static/migration`，未包含模板目录，导致运行时报错 `ENOENT: scandir '/app/templates/default-client'` 并返回 500。  
   - 在 `/.docker/deployment/app/Dockerfile` 中新增复制：`packages/app/src/code/client-dev/templates -> /app/templates`。

## 5. 验证（Verification）

1. 执行 `turbo run build --filter=@gepick/app`（或 `bun -F '@gepick/app' build`）确认 `packages/app` 产物含 `index.js` 与 `migrate.js`。
2. 执行：
   - `docker compose -f compose.yml -f compose.local.yml up -d --build`
3. 核对容器状态与日志：
   - `gepick_migration` 输出 `✅ Database migration completed` 且成功退出。
   - `gepick_server` 为 `Up`，监听 `3000` 端口。
4. 访问 `http://localhost:3000`：
   - 根路径返回前端 `index.html`；
   - `assets/*.js` 返回 JavaScript 内容，不再出现 MIME type `text/html` 或空 MIME 报错。
5. 用 `curl` 核对关键响应头：
   - `/` 返回 `Content-Type: text/html;charset=utf-8`
   - `/assets/*.js` 返回 `Content-Type: text/javascript;charset=utf-8`
   - `/assets/*.css` 返回 `Content-Type: text/css;charset=utf-8`
6. 用 `curl -X POST http://localhost:3000/project` 验证创建项目：
   - 返回 `200` 且含项目 JSON；
   - 服务日志不再出现 `ENOENT: scandir '/app/templates/default-client'`。

## 6. 参考（References）

- `/.docker/selfhost/compose.yml`
- `/.docker/selfhost/compose.local.yml`
- `/.docker/deployment/app/Dockerfile`
- `packages/app/src/storage/db.ts`
- `packages/app/src/server/app.ts`
- `packages/app/src/migrate.ts`
- `packages/app/src/env.ts`
- `packages/app/package.json`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `.docker/selfhost/compose.yml` | 引入独立 migration 服务并定义启动依赖关系。 |
| `.docker/selfhost/compose.local.yml` | 本地构建覆盖配置，支持本地 Dockerfile 联调。 |
| `.docker/deployment/app/Dockerfile` | 容器运行布局与入口调整，匹配当前 `/app` 约定。 |
| `.docker/deployment/app/Dockerfile` | 补齐 `default-client` 模板目录到镜像，修复 `POST /project` 500（ENOENT）。 |
| `packages/app/src/storage/db.ts` | 拆分迁移执行职责，修正运行时根路径解析。 |
| `packages/app/src/server/app.ts` | 静态文件响应显式设置 MIME，修复 module script 空 `Content-Type` 问题。 |
| `packages/app/src/migrate.ts` | 新增 one-shot 迁移入口。 |
| `packages/app/src/env.ts` | 增强 `.env` 路径探测兼容性。 |
| `packages/app/package.json` | 构建脚本新增 `migrate.js` 产物与迁移脚本入口。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`specs/delivery/bugfix/`*
