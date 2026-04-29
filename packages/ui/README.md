# @gepick/ui

gepick 内部 React 组件库；设计见 `docs/design/v1.md`。

## 开发

在仓库根目录：

```bash
bun -F @gepick/ui dev
```

或在 `packages/ui` 内执行 `bun storybook`。

> Storybook 10 需要 **Node.js 20.19+** 或 **22.12+**。若本地 `storybook` 命令报 Node 版本不符，请升级 Node 或使用 `nvm`/`fnm` 切换。

## 业务中引用

```tsx
import { Button, ThemeProvider } from "@gepick/ui"
import "@gepick/ui/styles/globals.css"
```

详见 v1 设计文档「产出形态」一节。
