# RCA：创建会话接口 `projectId` 读取来源错误导致 400

| 字段 | 内容 |
|------|------|
| **类型** | Bug（开发环境） |
| **严重度** | Medium（阻断「新建会话」主流程） |
| **影响面** | `session.create` 接口与会话页「新建会话」交互 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- 在会话页点击「新建会话」后，前端请求失败。
- 服务端返回校验错误：
  - `Invalid input: expected string, received undefined`
  - 路径为 `projectId`。
- 预期行为是：前端传入当前 Project 的 `projectId` 后，`POST /session` 成功创建会话。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `packages/app/src/server/session/controller.ts` 中 `POST /session` 的校验配置误用了 `validator("param", z.object({ projectId: z.string() }))`。
- 该路由为 `/session`，不存在 `:projectId` 路径参数，因此 `c.req.valid("param").projectId` 恒为 `undefined`。
- 校验器因此抛出 `projectId` 缺失，导致创建会话失败。

### 2.2 关联概念

- Hono 的 `param` 仅用于路径参数（如 `/:id`）；JSON body 应使用 `validator("json", schema)` 并通过 `c.req.valid("json")` 读取。
- SDK 更新后，`session.create` 已按 body 传参生成（`projectId` in body），需要与服务端读取方式保持一致。

## 3. 解决思路（Resolution Strategy）

目标：统一 `session.create` 的契约为「`POST /session` 从 JSON body 读取 `projectId`」，并确保 client 侧调用和类型映射一致。

| 方案名 | 说明 |
|------|------|
| 方案A（采用） | 服务端改为 `validator("json")` + `c.req.valid("json")`；客户端按更新后的 SDK 继续 `sdk.session.create({ projectId })`。 |
| 方案B | 继续使用 path 参数并改路由为 `/session/:projectId`。会破坏当前 API 设计一致性，且需要额外迁移，未采用。 |

## 4. 实施方案（Fix）

1. 服务端创建会话入口改为读取 JSON body：
   - `validator("param", ...)` -> `validator("json", ...)`
   - `c.req.valid("param").projectId` -> `c.req.valid("json").projectId`
2. 客户端确认使用更新后的 SDK 调用 `session.create`：
   - 继续以 `sdk.session.create({ projectId })` 发起请求（由 SDK 序列化到 body）。
3. 客户端 `Session` 映射补齐 `projectId` 字段，消除类型层面的不一致，避免后续列表与分组逻辑出现隐性问题。

## 5. 验证（Verification）

- 手动验证：
  1. 创建 Project；
  2. 点击「新建会话」；
  3. 确认 `POST /session` 返回 200，且响应包含 `sessionId` 与 `session`。
- 错误回归验证：
  - 不再出现 `projectId expected string, received undefined`。
- 静态检查：
  - 前后端相关改动文件无新增 TypeScript / Lint 报错。

## 6. 参考（References）

- `packages/app/src/server/session/controller.ts`
- `packages/client/src/session/session-api.ts`
- `packages/sdk/src/gen/sdk.gen.ts`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `packages/app/src/server/session/controller.ts` | `session.create` 入参从 `param` 改为 `json`，修复 `projectId` 读取来源。 |
| `packages/client/src/session/session-api.ts` | 对齐 SDK 调用与 `Session` 映射，补齐 `projectId`。 |
| `packages/sdk/src/gen/sdk.gen.ts` | 更新 `session.create` 参数来源为 body（由 SDK 生成产物体现）。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
