# s04 子 Agent

本文基于 Learn Claude Code 的 `s04` 章节整理，沿用 `s01`、`s02`、`s03` 的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么要把子任务丢给独立上下文去做，以及子 Agent 在工程上到底解决了什么问题。

参考原文：[Learn Claude Code - s04 子 Agent](https://learn.shareai.run/zh/s04/)

## 一句话理解

`s04` 的核心是：

`大任务拆小任务，每个小任务用一份干净的上下文单独完成`

更直白一点：

`父 Agent 负责调度，子 Agent 负责消化脏活和长过程`

## 为什么需要子 Agent

到了 `s03`，你已经有了：

- `Agent Loop`
- `dispatch map`
- `TodoWrite`

这已经足够让 Agent 做比较复杂的任务了。  
但新的问题也会随之出现：

- 读了很多文件
- 跑了很多命令
- 收集了很多工具输出
- `messages` 越堆越长

结果就是主上下文越来越胖。

比如用户只是问：

`这个项目用什么测试框架？`

Agent 可能为了回答这个问题：

- 读 `package.json`
- 读 `bunfig.toml`
- 搜测试目录
- 看 CI 配置

最后真正需要返回给主 Agent 的信息可能只有一句：

`这个项目用的是 Vitest`

但如果这些探索过程都留在父 Agent 的 `messages` 里，就会造成严重的上下文污染。

## `s04` 真正解决的核心问题

很多人会把子 Agent 理解成“并行工具”或者“更高级的函数调用”，但这一章最核心的本质其实是：

`让主上下文保持干净`

也就是：

- 复杂探索在子上下文中完成
- 子上下文可以很长、很脏、很啰嗦
- 父上下文只接收最终摘要

这和你自己写代码时会做的事情很像：

- 主函数不想知道所有细节
- 把复杂逻辑封装到子函数
- 子函数处理完，只返回必要结果

子 Agent 本质上就是“带独立记忆空间的子函数”。

## 用一句工程化的话记住它

`Subagent = fresh messages[] + own loop + summary back to parent`

也就是：

1. 子 Agent 从干净上下文启动
2. 它自己跑完整的 Agent 循环
3. 结束后只把摘要发回父 Agent

## 父 Agent 和子 Agent 的职责划分

你可以这样理解：

### 父 Agent

负责：

- 理解用户总目标
- 维护全局计划
- 判断哪些任务适合委派
- 接收子 Agent 的摘要结果
- 决定下一步怎么继续

### 子 Agent

负责：

- 在独立上下文里做具体子任务
- 可以读取文件、执行命令、调用基础工具
- 把长链路探索压缩成短摘要

这个分工很关键，因为它避免了父 Agent 既做总控又吃下所有中间垃圾信息。

## 最重要的设计：子 Agent 用独立 `messages`

这就是 `s04` 的核心实现点。

父 Agent 的上下文可能已经很长：

```ts
const parentMessages = [
  // 很长的历史消息
];
```

但子 Agent 启动时，不是直接复用它，而是重新开始：

```ts
const subMessages = [
  { role: "user", content: prompt }
];
```

注意这里最关键的不是“又开了一个函数”，而是：

`子 Agent 有自己的 messages[]`

这意味着：

- 子任务内部的工具输出不会污染父上下文
- 子任务可以自己反复试错
- 父上下文只保留一个结果摘要

## 为什么这比“直接在父上下文里探索”更好

如果没有子 Agent，父 Agent 自己去探索一个问题，会发生这些事：

- 一次次工具调用都进入父 messages
- 很多文件内容永久残留
- 一些只对当前探索有用的中间信息会不断膨胀
- 主任务的核心目标被稀释

而用子 Agent 后，父 Agent 只看到：

- 任务描述
- 最终摘要

这让主上下文信息密度更高。

## TypeScript 里怎么建模这个能力

你可以先把它理解成多了一个新工具：

- `task`

这个工具的功能不是读文件，也不是写文件，而是：

`spawn a subagent with fresh context`

从 `s02` 和 `s03` 的视角来看，它依然只是注册进 dispatch map 的一个工具，只不过这个工具内部会再跑一遍 Agent Loop。

## 一个最小的类型定义

```ts
type Message = {
  role: "user" | "assistant";
  content: unknown;
};

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
```

这些类型和前几章基本一致，区别不在数据结构，而在“谁持有哪份 messages”。

## 父工具集和子工具集要分开

这是 `s04` 里非常重要的一点。

通常做法是：

- 父 Agent 拥有基础工具 + `task`
- 子 Agent 只有基础工具，没有 `task`

为什么子 Agent 不能继续无限生成子 Agent？

因为如果不做限制，就可能出现：

- 子 Agent 再开子 Agent
- 再往下继续递归
- 任务树无限膨胀
- 成本和复杂度失控

所以最小实现里通常会禁止递归委派。

## 一个很典型的 TypeScript 结构

```ts
type ToolHandler = (input: ToolInput) => Promise<string>;

const childToolHandlers: Record<string, ToolHandler> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: runTodo,
};

const parentToolHandlers: Record<string, ToolHandler> = {
  ...childToolHandlers,
  task: runTask,
};
```

这样做的含义非常清晰：

- 子 Agent 能执行基础动作
- 只有父 Agent 能发起委派

## `runTask()` 到底做了什么

它的职责可以浓缩成一句话：

`用新的 messages 启动一个子 Agent，跑完后返回摘要`

一个最小示意大概像这样：

```ts
async function runTask(input: ToolInput) {
  const prompt = String(input.prompt ?? "");
  return await runSubagent(prompt);
}
```

真正复杂的部分在 `runSubagent()`。

## `runSubagent()` 的最小思路

你可以把它看成“在函数内部再跑一遍 `agentLoop()`”：

```ts
async function runSubagent(prompt: string): Promise<string> {
  const subMessages: Message[] = [
    { role: "user", content: prompt },
  ];

  for (let i = 0; i < 30; i++) {
    const response = await callModel({
      messages: subMessages,
      tools: childTools,
      system: SUBAGENT_SYSTEM,
    });

    subMessages.push({
      role: "assistant",
      content: response.content,
    });

    if (response.stop_reason !== "tool_use") {
      return extractTextSummary(response.content);
    }

    const toolResults: ToolResultBlock[] = [];

    for (const block of response.content as ToolUseBlock[]) {
      if (block.type !== "tool_use") continue;

      const handler = childToolHandlers[block.name];
      const output = handler
        ? await handler(block.input)
        : `Unknown tool: ${block.name}`;

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: output,
      });
    }

    subMessages.push({
      role: "user",
      content: toolResults,
    });
  }

  return "Subagent stopped after reaching the safety limit.";
}
```

这段代码几乎已经把 `s04` 的精神完整体现出来了：

- 子 Agent 有独立的 `messages`
- 子 Agent 有自己的循环
- 子 Agent 用基础工具工作
- 最终只返回摘要

## 为什么最后只返回“摘要文本”

这是这一章必须彻底理解的点。

子 Agent 在自己的上下文里，可能做了这些事：

- 读了 8 个文件
- 跑了 6 个命令
- 改了 3 次方向
- 做了几十轮推理和工具调用

但父 Agent 真正需要的，往往只是：

- 结论
- 发现
- 风险
- 下一步建议

所以父 Agent 不应该把子 Agent 的全部过程都接回来，而只应该接收压缩后的结果。

这就像：

- 子函数不返回调试日志，只返回结果
- SQL 查询不把执行计划回给上层业务代码

摘要返回的价值就在于：

`把高噪音长过程压缩成低噪音高信息密度结果`

## 一个常见误解

很多人会想：

`既然子 Agent 都做完了，为什么不把它的完整 messages 也挂回父 Agent？`

答案是：

因为那样就失去了上下文隔离的意义。

如果完整历史也回传，那父 Agent 还是会被所有中间噪音淹没，和没用子 Agent 没本质区别。

## 子 Agent 适合处理什么任务

特别适合这些子任务：

- 探索型任务
- 汇总型任务
- 信息抽取型任务
- 局部实现型任务

例如：

- “找出这个项目使用什么测试框架”
- “把所有配置文件读一遍并总结用途”
- “检查 auth 目录并总结模块职责”
- “帮我先实现这个小模块，再返回改动摘要”

## 不适合子 Agent 的场景

如果任务本身非常短小，就不一定值得开子 Agent，比如：

- 读一个已知文件
- 改一行代码
- 回答一个很直接的问题

因为启动子 Agent 本身也有成本：

- 一次新的模型循环
- 一组新的工具调用
- 一次摘要压缩

所以它适合“值得隔离”的任务，而不是任何事都委派。

## 从 TypeScript 工程角度怎么理解

你可以把 `s04` 看成是给 Agent 加了一层“任务边界”。

前几章里，所有事都在同一个执行空间里发生。  
从这章开始，你开始拥有：

- 父级执行空间
- 子级执行空间

这很像：

- 前端里的组件边界
- 后端里的子服务边界
- 操作系统里的子进程边界

每个边界的本质，都是为了把复杂度隔离开。

## `s04` 和 `s03` 结合起来会发生什么

你可以把两章连起来理解：

- `s03` 解决“主任务怎么保持计划”
- `s04` 解决“复杂子任务怎么不污染主上下文”

组合起来之后，一个更成熟的 Agent 就能做到：

1. 父 Agent 维护总 todo
2. 遇到重探索任务时开启子 Agent
3. 子 Agent 独立分析并总结
4. 父 Agent 根据摘要更新 todo 并继续推进

这时整个系统开始有一点“项目经理 + 执行专员”的感觉。

## 一个接近完整的最小结构

```ts
type ToolInput = Record<string, unknown>;

type ToolHandler = (input: ToolInput) => Promise<string>;

const childToolHandlers: Record<string, ToolHandler> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: runTodo,
};

const parentToolHandlers: Record<string, ToolHandler> = {
  ...childToolHandlers,
  task: async (input) => {
    const prompt = String(input.prompt ?? "");
    return await runSubagent(prompt);
  },
};

async function runSubagent(prompt: string) {
  const subMessages: Message[] = [
    { role: "user", content: prompt },
  ];

  for (let step = 0; step < 30; step++) {
    const response = await callModel({
      messages: subMessages,
      tools: childTools,
      system: SUBAGENT_SYSTEM,
    });

    subMessages.push({
      role: "assistant",
      content: response.content,
    });

    if (response.stop_reason !== "tool_use") {
      return extractTextSummary(response.content);
    }

    const results: ToolResultBlock[] = [];

    for (const block of response.content as ToolUseBlock[]) {
      if (block.type !== "tool_use") continue;

      const handler = childToolHandlers[block.name];
      const output = handler
        ? await handler(block.input)
        : `Unknown tool: ${block.name}`;

      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: output,
      });
    }

    subMessages.push({
      role: "user",
      content: results,
    });
  }

  return "Subagent stopped by safety limit.";
}
```

这段结构已经足够让你真正理解 `s04` 的实现方向。

## 这一章最值得学的工程观念

`s04` 最重要的不是“会不会开子 Agent”，而是这几个工程观念：

- 长过程不一定都要塞进主上下文
- 探索细节和全局决策应该分层
- 子任务应该有自己的记忆空间
- 返回给父层的信息应该尽量高密度
- 任务委派要有边界，不能无限递归

## 对 Bun + TypeScript 初学实现的建议

如果你要在自己的项目里实现最小版，不要一开始就做多子 Agent 并发。

建议按这 3 步来：

1. 先在父工具集里增加一个 `task`
2. 实现 `runSubagent(prompt)`，让它拥有独立 `messages`
3. 确保子 Agent 只返回摘要文本，不回传完整历史

只要这 3 步打通，你就已经真正掌握 `s04` 了。

## 推荐练习

你可以让你的最小 Agent 尝试处理这些提示：

1. `Use a subtask to identify the test framework in this project`
2. `Delegate reading all config files and summarize their purpose`
3. `Use a subagent to inspect the docs folder and explain what each document teaches`

练习时重点观察一件事：

`如果不用子 Agent，主上下文会不会迅速变脏；用了子 Agent 后，父层是否更专注于决策`

## 结论

`s04` 想让你建立的核心意识是：

不是所有问题都应该在同一份上下文里解决。  
复杂子任务需要自己的独立记忆空间，而父 Agent 只应该保留对子任务结果真正有用的摘要。

换成一句最容易记的话就是：

`Isolate the work, keep the summary.`
