# RCA：CI 中 `@gepick/client` 构建前未生成 `@gepick/sdk` 产物导致失败

| 字段 | 内容 |
|------|------|
| **类型** | Bug（CI 构建阶段） |
| **严重度** | High（阻断 `build-client` job） |
| **影响面** | GitHub Actions `build-dist` 工作流、`@gepick/client` TypeScript 校验 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在 CI 执行 `@gepick/client` 构建时失败，报错包含：

- `TS2307: Cannot find module '@gepick/sdk' or its corresponding type declarations.`
- 连带出现 `TS7006`（类型推断退化导致隐式 `any`）。

表现为 `@gepick/client build` 退出码为 2，整个 job 失败。

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- `@gepick/client` 的 `build` 脚本先执行 `tsc --noEmit`，需要解析 `@gepick/sdk` 的类型声明。
- `@gepick/sdk` 的类型声明来自其 `dist` 产物（`dist/index.d.ts`），而 CI 的 `build-client` job 中仅执行了 `bun install` + `build client`，没有先构建 SDK。
- 因此在干净 CI 环境中，`@gepick/sdk` 类型入口不可用，触发模块找不到错误。

### 2.2 关联概念

- monorepo 中 workspace 依赖若通过构建产物暴露类型/导出，消费者构建前必须确保上游包先完成构建。

## 3. 解决思路（Resolution Strategy）

目标：确保 `@gepick/client` 构建前，`@gepick/sdk` 的 `dist` 与类型声明已就绪。

| 方案 | 说明 |
|------|------|
| 方案 A（采用） | 在 `build-client` job 内先执行 `bun -F '@gepick/sdk' build`，再执行 client build。 |
| 方案 B | 改造 `@gepick/sdk` 为源码直连类型解析（不依赖 dist），改动范围较大且会影响发布模型。 |

## 4. 实施方案（Fix）

1. 修改 `/.github/workflows/build-dist.yml` 的 `build-client` job。
2. 在 `Install dependencies` 后新增步骤：
   - `Build sdk dist`：`bun -F '@gepick/sdk' build`
3. 保持后续步骤不变：
   - `Build client dist`：`bun -F '@gepick/client' build`

## 5. 验证（Verification）

1. 本地模拟 CI 顺序：
   - 清理 `packages/sdk/dist`
   - 执行 `bun -F '@gepick/sdk' build`
   - 执行 `bun -F '@gepick/client' build`
2. 结果：
   - `@gepick/client` 构建成功，不再出现 `TS2307 @gepick/sdk`。
3. 预期 CI 结果：
   - `build-dist` 的 `build-client` job 正常通过并产出 `client-dist` artifact。

## 6. 参考（References）

- `.github/workflows/build-dist.yml`
- `packages/client/package.json`
- `packages/sdk/package.json`
- `packages/sdk/scripts/build.ts`

## 7. 变更文件（Changelog）

| 文件路径 | 说明 |
|------|------|
| `.github/workflows/build-dist.yml` | 在 client job 中新增 SDK 预构建步骤，修复 `@gepick/client` CI 构建失败。 |
| `specs/delivery/bugfix/ci-client-build-depends-on-sdk-dist.md` | 新增本次 RCA 记录。 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`specs/delivery/bugfix/`*
