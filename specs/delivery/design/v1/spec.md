# Delivery (v1)

## 阶段定义

### Build（构建阶段）

负责把源码转换为可部署产物，例如各包 `dist`、应用打包结果、镜像构建输入。该阶段不做数据库 migration。

- 规范：[Build v1](./build/spec.md)
- Checklist：[Build checklist v1](./build/checklist.md)

### Release（发布阶段）

负责基于构建产物执行发布动作，例如镜像构建与推送、数据库 migration、发布前校验与回滚准备。

- 规范：[Release v1](./release/spec.md)
- Checklist：[Release checklist v1](./release/checklist.md)

### Run（运行阶段）

负责把已发布版本稳定运行起来，例如服务启动、健康检查、关键路径冒烟与运行监控。

- 规范：[Run v1](./run/spec.md)
- Checklist：[Run checklist v1](./run/checklist.md)
