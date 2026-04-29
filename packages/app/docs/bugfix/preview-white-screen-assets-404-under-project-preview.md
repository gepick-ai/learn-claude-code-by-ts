# RCA：`client/dist` 可生成但预览白屏（`/assets/*.js` 404）

| 字段 | 内容 |
|------|------|
| **类型** | Bug（client-dev 脚手架 / 预览路径契约） |
| **严重度** | High（用户可构建但无法在 Code 区预览） |
| **影响面** | `@gepick/app` 的 client 模板、`/project/:id/preview/*` 预览链路 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

- 用户在 project 的 `client/` 下成功执行 `npm run build`，并产出 `dist/`。
- Code 区 iframe 打开 `.../project/{id}/preview/client/dist/index.html` 后白屏。
- 浏览器控制台报错：
  - `http://localhost:5173/assets/index-xxxx.js net::ERR_ABORTED 404 (Not Found)`

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- 产物 `dist/index.html` 中脚本/样式引用为**绝对路径**：`/assets/...`。
- 预览页面并不运行在站点根，而是运行在子路径：
  - `/project/{id}/preview/client/dist/index.html`
- 因此浏览器请求被解析为 `http://host/assets/...`，而不是 `.../preview/client/dist/assets/...`，导致 404。

### 2.2 关联概念

- v4 预览入口是 `client/dist/index.html`，通过后端预览网关按相对路径读取文件。
- 若 Vite 使用默认 `base: "/"`，构建产物在子路径部署场景会天然错链。

---

## 3. 解决思路（Resolution Strategy）

目标：使构建产物在 **子路径预览** 下也能正确加载资源。

| 方案 | 说明 |
|------|------|
| **A（采用）** | 在 `vite.config` 中设置 `base: "./"`，生成相对资源路径 `./assets/...`。 |
| B | 改后端对 `/assets/*` 做额外转发或重写 | 增加网关复杂度，且与静态产物自描述原则冲突，未采用。 |

---

## 4. 实施方案（Fix）

1. **模板修复（根因修复）**
   - `packages/app/src/code/client-dev/templates/default-client/vite.config.js`
   - 增加：`base: "./"`
   - 保证新建 project 的 `client` 构建产物默认适配预览子路径。

2. **存量项目修复（就地止血）**
   - 受影响 project 的 `client/vite.config.js` 同步加入 `base: "./"`。
   - 重新执行 `npm run build`，生成新的 `dist/index.html`。

---

## 5. 验证（Verification）

- 修复前：`dist/index.html` 包含 `/assets/...`，预览请求落到根路径 404。
- 修复后：`dist/index.html` 变为 `./assets/...`，请求命中 `.../preview/client/dist/assets/...`。
- 实测：重新 build 后，iframe 正常加载应用，不再白屏。

---

## 6. 参考（References）

- [Code 业务区 v4](../design/code/v4.md)
- `packages/app/src/code/client-dev/templates/default-client/vite.config.js`
- `packages/app/src/server/project/controller.ts`（预览路由挂载）

---

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|----------|------|
| `packages/app/src/code/client-dev/templates/default-client/vite.config.js` | 新增 `base: "./"`，确保子路径预览可加载 `assets`。 |
| `<project>/client/vite.config.js`（存量） | 就地补充 `base: "./"` 并重建。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`packages/app/docs/bugfix/`*
