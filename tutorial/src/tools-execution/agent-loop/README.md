# s01 Agent 循环

本文基于 Learn Claude Code 的 `s01` 章节整理，结合 Bun + TypeScript 场景改写，方便你直接在当前项目里理解和实践最小可用的 Agent 循环。

参考原文：[Learn Claude Code - s01 Agent 循环](https://learn.shareai.run/zh/s01/)

## 一句话理解

一个最小 Agent，本质上就是：

`用户输入 -> 模型判断 -> 调用工具 -> 把工具结果喂回模型 -> 重复直到模型停止`

也就是一个 `while` 循环，加上一个工具执行器。

## 为什么需要 Agent 循环

语言模型本身只会“生成下一段文本”，但它默认不能：

- 读取真实文件
- 执行命令
- 查看报错
- 根据执行结果继续下一步

如果没有循环，每次工具执行完，你都要手动把结果再贴回模型。  
Agent 循环做的事情，就是自动完成这个往返过程。

## 最小结构

最小版本只需要 4 个部分：

1. `messages`
   保存对话上下文
2. `model`
   负责推理下一步做什么
3. `tools`
   负责执行外部动作，比如 bash、读文件、写文件
4. `while` 循环
   只要模型还想调用工具，就继续跑

## 基本流程

### Step 1: 放入用户问题

把用户输入加入消息列表：

```ts
messages.push({
  role: "user",
  content: "Create a file called hello.py",
});
```

### Step 2: 把消息和工具定义发给模型

模型根据上下文决定：

- 直接回答
- 或者调用某个工具

```ts
const response = await client.messages.create({
  model: MODEL,
  system: SYSTEM,
  messages,
  tools: TOOLS,
});
```

### Step 3: 检查是否还要调工具

如果模型不再请求工具，循环结束。

```ts
if (response.stop_reason !== "tool_use") {
  return response;
}
```

### Step 4: 执行工具

遍历模型返回的工具调用，逐个执行。

```ts
for (const block of response.content) {
  if (block.type === "tool_use") {
    const result = await runTool(block);
  }
}
```

### Step 5: 把工具结果回传给模型

工具输出不是直接给用户，而是作为新的消息回到模型：

```ts
messages.push({
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: block.id,
      content: result,
    },
  ],
});
```

然后继续下一轮循环。

## 最小 Agent 核心

下面是一个非常接近实战的 TypeScript 版伪代码：

```ts
type Message =
  | { role: "user"; content: string | ToolResult[] }
  | { role: "assistant"; content: unknown };

type ToolUse = {
  id: string;
  type: "tool_use";
  name: string;
  input: Record<string, unknown>;
};

type ToolResult = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

async function agentLoop(userInput: string) {
  const messages: Message[] = [{ role: "user", content: userInput }];

  while (true) {
    const response = await callModel(messages);

    messages.push({
      role: "assistant",
      content: response.content,
    });

    if (response.stop_reason !== "tool_use") {
      return response;
    }

    const toolResults: ToolResult[] = [];

    for (const block of response.content as ToolUse[]) {
      if (block.type !== "tool_use") continue;

      const output = await runTool(block.name, block.input);

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: output,
      });
    }

    messages.push({
      role: "user",
      content: toolResults,
    });
  }
}
```

## 你应该抓住的本质

这个章节最重要的不是某个 SDK 写法，而是这个控制流：

```ts
while (response.stop_reason === "tool_use") {
  // 执行工具
  // 追加结果
  // 再次调用模型
}
```

它意味着：

- 模型负责“决策”
- 工具负责“行动”
- 循环负责“闭环”

## 最小可用能力为什么成立

虽然只有一个循环和一个工具，但已经能做很多事，比如：

- 创建文件
- 读取目录
- 执行脚本
- 查看当前 git 分支
- 根据报错继续修复

因为一旦模型能拿到“外部世界反馈”，它就不再只是一次性文本生成器，而变成了可迭代执行的 Agent。

## 和普通脚本的区别

普通脚本通常是你提前写死流程：

1. 先做 A
2. 再做 B
3. 最后做 C

Agent 循环不是写死步骤，而是：

1. 把目标给模型
2. 让模型决定下一步
3. 根据工具结果继续动态决策

所以它更像“目标驱动”，而不是“流程驱动”。

## 在 TypeScript 里怎么落地

如果你想自己实现一个最小 Agent，建议拆成这几个函数：

### `callModel(messages)`

职责：

- 调用模型 API
- 返回 `response.content`
- 返回 `stop_reason`

### `runTool(name, input)`

职责：

- 根据工具名分发执行器
- 例如 `bash`、`readFile`、`writeFile`
- 把结果统一转成字符串

### `agentLoop(userInput)`

职责：

- 初始化消息
- 驱动 `while` 循环
- 把工具结果持续喂回模型
- 直到模型停止

## 一个更贴近 Bun 的简化示意

如果我们先只支持一个 `bash` 工具，代码结构可以像这样：

```ts
import { $ } from "bun";

async function runBash(command: string) {
  const output = await $`${{ raw: command }}`.text();
  return output;
}

async function runTool(name: string, input: Record<string, unknown>) {
  if (name === "bash") {
    return runBash(String(input.command ?? ""));
  }

  throw new Error(`Unknown tool: ${name}`);
}
```

这样就能先把“一个工具 + 一个循环”的最小闭环跑起来。

## 学这一章时不要陷进去的细节

先不要过度纠结这些：

- SDK 具体字段名
- 工具 schema 怎么写得很完整
- 多工具并发
- 子 Agent
- 长上下文压缩

这一章只要吃透一件事就够了：

`Agent = LLM + Tools + While Loop`

## 推荐练习

你可以尝试让自己的最小 Agent 完成这些任务：

1. 列出当前目录文件
2. 创建一个 `hello.txt`
3. 读取 `package.json`
4. 执行 `bun run index.ts`
5. 根据命令报错再修复一次

## 下一步该学什么

理解完 `s01` 后，下一步通常就是：

- 给 Agent 增加更稳定的工具接口
- 让工具输入输出有结构
- 支持多个工具
- 加入任务拆解和更长流程控制

但这些都建立在 `s01` 的循环之上。

## 结论

`s01` 想表达的核心非常简单：

不是“模型会不会写代码”，而是“模型能不能通过工具和外部世界形成反馈闭环”。

只要闭环建立起来，Agent 就出现了。
