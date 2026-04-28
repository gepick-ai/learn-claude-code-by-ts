# @agent-dev/learn-claude-code

从原仓库根目录 `src/` 迁出的学习与示例代码（规划、协作、工具执行等 **s01–s12**）。

在仓库根执行：

```bash
bun run s01
# 或
bun run -F @agent-dev/learn-claude-code s01
```

其它应用通过 package **exports** 引用公共工具，例如：

- `@agent-dev/learn-claude-code/common/tools/fs`
- `@agent-dev/learn-claude-code/common/main`
