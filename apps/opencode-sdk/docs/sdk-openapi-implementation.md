# SDK 落地指南（OpenAPI 驱动）

## 1. 目标与边界

- 目标：基于 `openapi.json` 生成可供 Client 调用的 SDK，避免手写 `fetch`。
- 边界：Server 视为黑盒，只负责产出 OpenAPI；本文只关注 SDK 产物构建与交付。

## 2. 角色分工

- Server：协议源头（产出 OpenAPI）。
- OpenAPI：协议文件（桥梁）。
- SDK：协议代码化（生成类型与调用方法）。
- Client：协议使用方（调用 SDK，不直连手写 HTTP 细节）。

## 3. 技术选型（开发时 vs 运行时）

### 开发时（Build-time）

- `@hey-api/openapi-ts`：代码生成引擎。
- `@hey-api/typescript`：生成类型定义。
- `@hey-api/sdk`：生成 SDK 调用方法。
- `typescript` / `@typescript/native-preview`：类型检查与编译。
- `bun`：执行构建脚本串联生成流程。

### 运行时（Runtime）

- `@hey-api/client-fetch`：生成代码的 fetch 传输层。
- 平台 `fetch`：真实网络请求执行。
- `src/client.ts` 包装层：统一注入 `baseUrl`、headers、auth、timeout 等策略。

## 4. 工程结构建议

- `packages/sdk/js/script/build.ts`：SDK 构建入口。
- `packages/sdk/js/src/gen/*`：自动生成文件（禁止手改）。
- `packages/sdk/js/src/client.ts`：手写包装层（稳定 API）。
- `packages/sdk/js/src/index.ts`：对外导出入口。

## 5. 生成流水线

1. 获取 `openapi.json`（文件或 URL）。
2. 执行生成器（types + sdk + fetch client）。
3. 输出到 `src/gen/*`。
4. 执行 typecheck/build。
5. 发布 SDK 包给 Client 使用。

## 6. 交付标准（Definition of Done）

- 能生成：构建脚本稳定输出 SDK 代码。
- 能编译：`typecheck` 通过。
- 能调用：Client 仅用 `client.xxx.yyy()` 完成核心业务。
- 可维护：`gen` 目录无手改；包装层职责清晰。
- 可演进：Server 变更后可自动再生成并发布。

## 7. 团队约束

- OpenAPI 是唯一契约源，禁止 Client 新增裸 `fetch`。
- `operationId` 必填，否则不纳入 SDK。
- 生成文件不允许人工修改。
- 每次接口变更必须触发 SDK 重建与版本升级。

## 8. 常见风险与对策

- 风险：命名不一致（`sessionId` / `sessionID`）。
  - 对策：先统一契约命名规范。
- 风险：错误响应未建模导致前端兜底混乱。
  - 对策：统一 `4xx/5xx` error schema。
- 风险：生成产物频繁抖动。
  - 对策：固定生成配置与插件版本。
