# Release (v1)

## 目标

基于 Build 产物完成可回滚的发布动作，包括镜像处理与数据库 schema 变更。

## 职责范围

- 构建镜像并推送到镜像仓库
- 执行数据库 migration
- 执行发布前验证与回滚准备

## 阶段约束

- migration 属于 Release，不属于 Build。
- migration 应在切流前执行，并保证可观测与可回滚策略。
- Release 不重新编译源码，避免与 Build 结果不一致。

## 建议顺序

1. 使用 Build 产物构建镜像
2. 推送镜像（含 tag 策略）
3. 执行 migration
4. 完成发布前检查并进入 Run 阶段
