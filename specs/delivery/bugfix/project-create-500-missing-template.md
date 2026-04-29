# RCA：`POST /project` 返回 500（模板目录缺失）

| 字段 | 内容 |
|------|------|
| **类型** | Bug（selfhost 运行阶段） |
| **严重度** | High（阻断项目创建主流程） |
| **影响面** | `@gepick/app` 的 `POST /project`、新项目初始化链路 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在 selfhost 环境启动后，前端创建项目时报错：

- 浏览器控制台：`POST http://localhost:3000/project 500 (Internal Server Error)`。
- 服务端日志出现：
  - `ensureCodeWorkspace failed`
  - `ENOENT: no such file or directory, scandir '/app/templates/default-client'`。

预期行为是 `POST /project` 返回 `200`，并完成项目目录与 `client` 模板初始化。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `projectService.createProject()` 会调用 `ensureCodeWorkspace()`。
- `ensureCodeWorkspace()` 内部会通过 `ensureClientProjectTemplate()` 复制 `templates/default-client` 到项目目录。
- 容器镜像仅拷贝了运行产物、静态资源与 migration，未包含模板目录，导致运行时访问 `/app/templates/default-client` 失败并抛出 `ENOENT`，最终返回 500。

### 2.2 关联概念

- 这类模板文件属于**运行期依赖资源**，不是仅在构建时使用的资源；镜像构建时必须显式打包。

## 3. 解决思路（Resolution Strategy）

目标：保证容器内具备项目初始化所需模板资源，使 `POST /project` 在 selfhost 下稳定返回成功。

| 方案 | 说明 |
|------|------|
| 方案 A（采用） | 保持现有模板复制机制，在 Docker 镜像中补齐 `templates/default-client` 目录。 |
| 方案 B | 改造代码为运行时远程拉取模板或内嵌字符串模板，改造面更大且风险更高。 |

## 4. 实施方案（Fix）

1. 修改 `/.docker/deployment/app/Dockerfile`：
   - 在 assets 阶段新增模板拷贝：
   - `COPY --chown=bun:bun packages/app/src/code/client-dev/templates /app/templates`
2. 重建并重启 selfhost 服务：
   - `docker compose -f compose.yml -f compose.local.yml up -d --build`
3. 重新请求 `POST /project`，验证创建成功。

## 5. 验证（Verification）

1. 启动状态验证：
   - `gepick_migration` 成功退出；
   - `gepick_server` 正常 `Up` 并监听 `3000`。
2. 接口验证：
   - 执行 `curl -X POST http://localhost:3000/project`；
   - 返回 `HTTP/1.1 200 OK`，响应体包含 `id/name/createdAt/updatedAt`。
3. 日志验证：
   - 不再出现 `ENOENT: ... '/app/templates/default-client'`。
4. 容器文件验证：
   - `/app/templates/default-client` 目录存在且包含 `package.json`、`src/main.jsx` 等模板文件。

## 6. 参考（References）

- `/.docker/deployment/app/Dockerfile`
- `packages/app/src/server/project/service.ts`
- `packages/app/src/code/client-dev/workspace-root.ts`
- `packages/app/src/code/client-dev/scaffold-client.ts`
- `/.docker/selfhost/compose.yml`
- `/.docker/selfhost/compose.local.yml`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `.docker/deployment/app/Dockerfile` | 增加模板目录复制到镜像，修复 `POST /project` 初始化失败。 |
| `specs/delivery/bugfix/project-create-500-missing-template.md` | 新增本次问题 RCA 归档。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`specs/delivery/bugfix/`*
