# s02 工具

本文基于 Learn Claude Code 的 `s02` 章节整理，沿用 `s01` 的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚“工具如何接入 Agent，而不用改循环本身”。

参考原文：[Learn Claude Code - s02 工具](https://learn.shareai.run/zh/s02/)

## 一句话理解

`s02` 的核心是：

`循环不变，只把新工具注册到一个 dispatch map 里`

也就是说，Agent 的 `while` 循环还是 `s01` 那个循环，你要扩展能力时，不是改循环，而是加工具处理器。

## 为什么要从单一 bash 进化到专用工具

在 `s01` 里，如果只有一个 `bash` 工具，很多事情都能做，但会带来几个问题：

- 读文件要靠 shell 命令，输出格式不稳定
- 写文件和编辑文件会受转义、特殊字符影响
- 所有动作都走命令行，安全边界过大
- 工具能力不清晰，模型容易乱用

所以 `s02` 引入了更明确的专用工具，比如：

- `bash`
- `read_file`
- `write_file`
- `edit_file`

这样做的关键收益是：

- 工具输入输出更稳定
- 路径可以做沙箱限制
- Agent 能力更明确
- 扩展工具时不需要动主循环

## 最关键的结论

`加工具 != 改循环`

这是 `s02` 最重要的一句话。

如果 `s01` 解决的是“Agent 要怎么跑起来”，那 `s02` 解决的是“Agent 的能力要怎么扩展得干净”。

## 整体结构

你可以把 `s02` 理解成 3 层：

1. `Agent Loop`
   负责不断调用模型
2. `Tool Dispatch Map`
   负责根据工具名找到对应处理函数
3. `Tool Handlers`
   负责执行具体工具逻辑

关系大概像这样：

`模型输出 tool name -> dispatch map 查找 handler -> handler 执行 -> 返回 tool_result`

## 先看最核心的变化

在 `s01` 中，你可能是这样写死的：

```ts
if (block.name === "bash") {
  const output = await runBash(block.input.command);
}
```

这种方式的问题是：

- 工具一多，`if/else` 会越来越长
- 每加一个工具都要修改主逻辑
- 代码会逐渐耦合

`s02` 的解法是：改成一个“工具分发表”。

## Tool Dispatch Map 是什么

它本质上就是一个对象：

```ts
const toolHandlers = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
};
```

当模型返回一个工具调用时，你不再写一串判断，而是直接查表：

```ts
const handler = toolHandlers[block.name];
```

如果查到了，就执行；没查到，就返回未知工具错误。

## TypeScript 版最小结构

下面是一个接近实战的 TypeScript 结构：

```ts
type ToolInput = Record<string, unknown>;

type ToolHandler = (input: ToolInput) => Promise<string>;

const toolHandlers: Record<string, ToolHandler> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
};
```

这个结构的价值很大：

- 主循环不关心工具细节
- 工具扩展只需要新增 handler
- 更容易测试单个工具

## 主循环如何保持不变

这就是 `s02` 最想让你建立的工程习惯：

```ts
for (const block of response.content) {
  if (block.type !== "tool_use") continue;

  const handler = toolHandlers[block.name];

  const output = handler
    ? await handler(block.input)
    : `Unknown tool: ${block.name}`;

  toolResults.push({
    type: "tool_result",
    tool_use_id: block.id,
    content: output,
  });
}
```

注意，变化只发生在“如何执行工具”这一层，`while` 主循环仍然和 `s01` 一样。

## 用 TypeScript 组织代码时怎么拆

建议你把代码拆成下面这些部分：

### `agentLoop(userInput)`

职责：

- 维护 `messages`
- 调用模型
- 收集工具调用
- 把工具结果返回给模型

### `toolHandlers`

职责：

- 建立工具名到处理函数的映射
- 解耦主循环和工具实现

### `runBash(input)`

职责：

- 执行 shell 命令
- 返回标准输出或错误信息

### `runReadFile(input)`

职责：

- 读取指定文件
- 可选限制返回长度
- 保证路径安全

### `runWriteFile(input)`

职责：

- 创建或覆盖文件
- 写入指定内容

### `runEditFile(input)`

职责：

- 对已有文件做定向替换
- 避免每次都整文件重写

## 路径安全为什么重要

这是 `s02` 里另一个很重要的点。

如果你给模型一个 `read_file` 工具，但不限制路径，它就可能读到工作区外的文件。  
所以一般需要一个 `safePath()`：

```ts
import path from "node:path";

const WORKSPACE_ROOT = process.cwd();

function safePath(inputPath: string) {
  const resolved = path.resolve(WORKSPACE_ROOT, inputPath);

  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path escapes workspace: ${inputPath}`);
  }

  return resolved;
}
```

这样就能把工具访问范围限制在当前项目下。

## 更稳一点的 safePath 写法

在真实项目里，推荐比 `startsWith` 更谨慎一点，比如用相对路径判断：

```ts
import path from "node:path";

function safePath(inputPath: string) {
  const root = process.cwd();
  const resolved = path.resolve(root, inputPath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace: ${inputPath}`);
  }

  return resolved;
}
```

这是因为单纯 `startsWith` 在某些路径边界上可能不够严谨。

## 4 个工具的 TypeScript 思路

### 1. `bash`

```ts
import { $ } from "bun";

async function runBash(input: ToolInput) {
  const command = String(input.command ?? "");
  return await $`${{ raw: command }}`.text();
}
```

适合：

- 跑命令
- 看目录
- 执行脚本

不适合：

- 频繁做精确文件编辑

### 2. `read_file`

```ts
async function runReadFile(input: ToolInput) {
  const filePath = safePath(String(input.path ?? ""));
  const text = await Bun.file(filePath).text();
  const limit = Number(input.limit ?? 0);

  if (!limit || limit <= 0) return text;

  return text.split("\n").slice(0, limit).join("\n");
}
```

适合：

- 稳定读文件内容
- 限制返回行数

### 3. `write_file`

```ts
async function runWriteFile(input: ToolInput) {
  const filePath = safePath(String(input.path ?? ""));
  const content = String(input.content ?? "");

  await Bun.write(filePath, content);
  return `Wrote ${filePath}`;
}
```

适合：

- 创建文件
- 覆盖整个文件

### 4. `edit_file`

```ts
async function runEditFile(input: ToolInput) {
  const filePath = safePath(String(input.path ?? ""));
  const oldText = String(input.old_text ?? "");
  const newText = String(input.new_text ?? "");

  const file = Bun.file(filePath);
  const content = await file.text();

  if (!content.includes(oldText)) {
    throw new Error("Old text not found");
  }

  const updated = content.replace(oldText, newText);
  await Bun.write(filePath, updated);

  return `Edited ${filePath}`;
}
```

适合：

- 定点修改已有文件
- 避免整文件重写

## 为什么 dispatch map 比 if/else 更好

因为它让扩展工具变成一个局部变化。

比如你以后要增加 `list_dir`，你只需要：

1. 写一个 `runListDir`
2. 把它注册进 `toolHandlers`
3. 给模型声明 schema

主循环完全不用碰。

这就是高内聚、低耦合。

## 和 s01 的关系

你可以把两章连起来记：

- `s01`：先把 Agent 跑起来
- `s02`：让 Agent 的工具系统变得可扩展

所以两章的关系不是替代，而是叠加。

## 用 TypeScript 记住这张图

最值得你背下来的其实是这段结构：

```ts
async function runToolCall(name: string, input: ToolInput) {
  const handler = toolHandlers[name];

  if (!handler) {
    return `Unknown tool: ${name}`;
  }

  return await handler(input);
}
```

以后不管你加多少工具，本质上都还是这套分发逻辑。

## 一个接近完整的最小示意

```ts
type ToolInput = Record<string, unknown>;

type ToolUseBlock = {
  id: string;
  type: "tool_use";
  name: string;
  input: ToolInput;
};

type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

type ToolHandler = (input: ToolInput) => Promise<string>;

const toolHandlers: Record<string, ToolHandler> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
};

async function runToolCall(block: ToolUseBlock): Promise<ToolResultBlock> {
  const handler = toolHandlers[block.name];

  const content = handler
    ? await handler(block.input)
    : `Unknown tool: ${block.name}`;

  return {
    type: "tool_result",
    tool_use_id: block.id,
    content,
  };
}
```

这就是 `s02` 的工程落点。

## 学这一章最容易忽略的点

很多人会把注意力放在“又多了 4 个工具”，但真正该记住的是：

- 新工具是注册进去的，不是塞进主循环里的
- 工具最好是专用语义，不要全靠 bash
- 文件工具一定要做路径沙箱
- 工具数量增加时，dispatch map 会比条件分支更稳定

## 推荐练习

你可以尝试自己实现下面这些提示词：

1. `Read the file package.json`
2. `Create a file called greet.ts with a greet(name) function`
3. `Edit greet.ts to add a JSDoc comment`
4. `Read greet.ts to verify the edit worked`

## 结论

`s02` 想让你建立的工程意识是：

Agent 的核心循环应该尽量稳定，而工具能力应该通过注册和分发去扩展。

换成一句最容易记的话就是：

`Loop stays the same. Tools grow through handlers.`
