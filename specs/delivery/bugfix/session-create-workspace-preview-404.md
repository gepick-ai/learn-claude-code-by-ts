# RCA：创建会话时工作区预览入口 `client/dist/index.html` 返回 404

| 字段 | 内容 |
|------|------|
| **类型** | Bug（selfhost 运行阶段） |
| **严重度** | Medium（会话创建后代码预览链路异常） |
| **影响面** | `@gepick/client` 代码面板预览探测、`@gepick/app` 工作区文件读取接口 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在页面创建会话时，浏览器出现请求失败：

- `GET /project/:projectId/workspace/file?path=client%2Fdist%2Findex.html 404 (Not Found)`

该异常会影响代码预览初始化，用户在会话刚创建时无法稳定拿到预览入口。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- 客户端代码预览固定探测 `client/dist/index.html` 作为工作区预览入口。
- 新创建项目时，模板初始化主要落在 `client/src`，默认并不会立即产出 `client/dist/index.html`。
- 在用户尚未执行 `npm install && npm run build` 之前，后端读取该路径自然返回 404。

### 2.2 关联概念

- `client/dist` 属于构建产物目录，按常规流程应由构建命令生成；但当前产品交互在“首次会话创建”阶段就触发了对该入口文件的探测，因此需要兜底策略。

## 3. 解决思路（Resolution Strategy）

目标：确保首次创建会话时预览入口路径可读，避免 `client/dist/index.html` 缺失导致 404。

| 方案 | 说明 |
|------|------|
| 方案 A（采用） | 在工作区模板保障逻辑中补齐 `client/dist/index.html` 占位文件；真实构建后由正式产物覆盖。 |
| 方案 B | 改造前端预览入口策略，不再依赖 `client/dist/index.html`；涉及前后端协议调整，改造面更大。 |

## 4. 实施方案（Fix）

1. 修改 `packages/app/src/code/client-dev/scaffold-client.ts`：
   - 新增 `ensureDistPreviewPlaceholder(clientDir)`；
   - 当 `client/dist/index.html` 不存在时，自动创建占位 HTML。
2. 调整 `ensureClientProjectTemplate()`：
   - 保留“`client/package.json` 已存在时不覆盖模板”；
   - 但无论模板是否已存在，都会执行 `ensureDistPreviewPlaceholder()`，保证预览入口文件存在。
3. 重新构建并重启 selfhost 环境，验证接口行为。

## 5. 验证（Verification）

1. 构建与启动：
   - `bun -F '@gepick/app' build`
   - `docker compose -f compose.yml -f compose.local.yml up -d --build`
2. 创建项目后调用：
   - `GET /project/:projectId/workspace/file?path=client%2Fdist%2Findex.html`
3. 结果验证：
   - 返回 `200`（不再 404）；
   - 返回内容为占位 HTML（提示执行 `npm install` 与 `npm run build`）。
4. 页面回归：
   - 首页、创建项目、创建会话流程可正常使用。

## 6. 参考（References）

- `packages/app/src/code/client-dev/scaffold-client.ts`
- `packages/client/src/code/workspace-preview.ts`
- `packages/client/src/code/code-store.ts`
- `packages/app/src/server/project/controller.ts`
- `/.docker/selfhost/compose.yml`
- `/.docker/selfhost/compose.local.yml`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `packages/app/src/code/client-dev/scaffold-client.ts` | 补齐 `client/dist/index.html` 占位文件，修复首次会话预览入口 404。 |
| `specs/delivery/bugfix/session-create-workspace-preview-404.md` | 新增本次 RCA 归档文档。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`specs/delivery/bugfix/`*
