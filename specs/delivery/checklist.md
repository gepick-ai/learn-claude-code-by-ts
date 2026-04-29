# 交付前检查清单（Delivery Readiness）

无论当前交付流水线的版本或形态如何，在**正式对外交付或升级线上环境之前**，建议按下列路径之一完成验证，确认产物可正确交付。

| 阶段 | 构建 dist / 镜像 | 验证环境 |
|------|------------------|----------|
| A | 本地 | 本地 `.docker/selfhost` |
| B | GitHub CI | 本地 `.docker/selfhost`（镜像来自 CI） |
| C | （沿用已发布镜像） | 线上正式 host |

---

## 路径 A：本地构建镜像并自测

适用于：希望在推送前本地确认 dist 与镜像可用。

1. **构建各包产物（dist）**  
   在仓库根目录执行 `bun build:packages`（或按需使用 `bun turbo run build --filter=…` 仅构建变更包）。确保 client / app 等产物生成无误。

2. **构建部署镜像**  
   使用 `.docker/deployment/app/Dockerfile` 构建镜像（与线上部署所用 Dockerfile 一致）。

3. **本地 selfhost 验证**  
   在 `.docker/selfhost` 下按 [selfhost README](../../.docker/selfhost/README.md) 配置 `.env`，使用**本地构建模式**（例如 `docker compose -f compose.yml -f compose.local.yml up --build`）拉起服务，完成一轮功能与回归检查。

---

## 路径 B：GitHub CI 产出镜像后本地 selfhost 验证

适用于：用 CI 替代本地的「构建 dist + 构建镜像」步骤，但仍需在可控环境先验一遍。

1. **推送代码到 GitHub**，触发或手动运行仓库内的 CI（例如 `build-dist` / `build-image` 等工作流：构建 client、server 的 dist，并基于同一 `.docker/deployment/app/Dockerfile` 构建并推送镜像）。

2. **拉取 CI 产出的镜像**，在 `.docker/selfhost` 的 `.env` 中将 `APP_IMAGE` 指向该镜像标签（例如 `ghcr.io/<owner>/gepick:latest` 或与本次构建一致的 tag）。

3. **本地 selfhost 验证**  
   使用**远端镜像模式**（`docker compose up -d`），确认迁移与主服务启动正常，并完成与路径 A 同等粒度的检查。

> 说明：此路径下，**本地不再重复**执行与 CI 等价的 `build:packages` / 镜像构建；验证焦点是「CI 产物 + selfhost 编排」是否一致可用。

---

## 路径 C：线上（正式）环境确认

在路径 A 或 B 验证通过后，再到**线上正式 host** 做一次确认：

- 使用与线上一致的 `.docker/selfhost` 编排（仓库内同目录约定），配置指向**线上应使用的镜像与环境变量**。
- 确认迁移、服务启动、核心业务路径与健康检查均符合预期。

此步骤用于发现「仅本地/测试镜像无法覆盖」的线上配置、网络与数据差异问题。

---

## 小结

至少完成 **B + C** 或 **A + C**，再视为交付就绪。若流水线调整，优先保证「产物来源清晰（本地或 CI）+ selfhost 可跑通 + 线上最终确认」三条不变。
