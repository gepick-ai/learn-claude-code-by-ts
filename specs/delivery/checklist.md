# 交付前检查清单（Delivery Readiness）

无论当前交付流水线的版本或形态如何，在**正式对外交付或升级线上环境之前**，建议按下列路径之一完成验证，确认产物可正确交付。

| 阶段 | 构建 dist / 镜像 | 验证环境 |
|------|------------------|----------|
| A | 本地 | 本地 `.docker/selfhost` |
| B | GitHub CI | 本地 `.docker/selfhost`（镜像来自 CI） |
| C | （沿用已发布镜像） | 线上正式 host |

---

## 路径 A：本地构建镜像并自测

```sh
# 在本地项目根目录构建项目所有package dist
cd /path/to/gepick
bun build:packages

# 到 .docker/selfhost 部署；compose 必须在这个目录跑
cd .docker/selfhost

# 首次准备 .env，已存在可跳过
cp -n .env.example .env

# 验证部署服务
docker compose -f compose.yml -f compose.local.yml up --build -d --force-recreate
```
- 注意：每一轮新的验证都需要在项目根目录重新构建项目所有package dist。
- 相关文档：[selfhost README](../../.docker/selfhost/README.md)。
---

## 路径 B：GitHub CI 产出镜像后本地 selfhost 验证

```sh
# push代码，然后GitHub Actions 手动运行 build-image
cd /path/to/gepick
git push

# CI完成image构建后到 .docker/selfhost 部署；compose 必须在这个目录跑
cd .docker/selfhost

# 首次准备 .env，已存在可跳过
cp -n .env.example .env

# 验证部署服务
docker compose -f compose.yml  up --build -d --force-recreate
```
- 注意：不需要在本地执行 `bun build:packages`了，我们将构建packages dist和build image环节交给CI做了，只需要验证服务。
- 相关文档：[selfhost README](../../.docker/selfhost/README.md)。

---

## 路径 C：线上环境确认

```sh
# 线上云主机
cd /path/to/gepick

# 到 .docker/selfhost 部署；compose 必须在这个目录跑
cd .docker/selfhost

# 首次准备 .env，已存在可跳过
cp -n .env.example .env

# 验证部署服务
docker compose -f compose.yml  up --build -d --force-recreate
```
- 注意：路径 A 或 B 通过后执行。
- 相关文档：[selfhost README](../../.docker/selfhost/README.md)。

---

## 小结

至少完成 **B + C** 或 **A + C** 再交付。
