# Build Checklist (v1)

在进入 Release 前，先在本地或 CI 完成以下 Build 检查。

- [x] **依赖安装可执行**：在 workspace 根目录执行安装命令成功，无中断错误。
- [x] **脚本存在性检查**：workspace 根与各包存在主线需要脚本（至少包含各包 `build` 与镜像相关入口）。
- [x] **构建顺序可执行**：按 `@gepick/core -> @gepick/sdk -> @gepick/client -> @gepick/app` 顺序逐步执行，全部返回成功。
- [x] **命令用法正确**：命令参数、工作目录与文档一致，不依赖 CI 特有环境变量。
- [x] **`@gepick/core` 产物校验**：存在 `dist` 且包含可供下游消费文件。
- [x] **`@gepick/sdk` 产物校验**：存在 `dist` 且导出文件完整，且不出现 `dist/src`。
- [x] **`@gepick/client` 产物校验**：生成 Vite `dist`，包含 `index.html` 与静态资源目录。
- [x] **`@gepick/app` 产物校验**：app 构建成功，且产物路径符合运行约定。
