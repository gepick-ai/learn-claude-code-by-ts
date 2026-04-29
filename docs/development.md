## 安装项目依赖

整个仓库基于Bun进行管理，需先安装 [Bun](https://bun.sh)。

```sh
# 在项目根目录执行
bun install
```

## 准备App Dev环境

```sh
# app 运行环境变量：复制示例后编辑 packages/app/.env
cp packages/app/.env-example packages/app/.env

# 当 packages/app/migration/ 下有新的迁移（例如 git pull 之后，或本地执行过 bun build:migration）时，在仓库根目录执行一次，将迁移应用到本地 SQLite：
bun run:migration
```

## 启动App

```sh
bun dev:app
```

## 启动Client

```sh
# 在项目根目录执行
bun dev:client
```
