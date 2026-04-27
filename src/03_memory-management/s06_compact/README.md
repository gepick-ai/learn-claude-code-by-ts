# s06 上下文压缩

本文基于 Learn Claude Code 的 `s06` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么上下文一定会被撑满，以及一个 Agent 如何通过“三层压缩”把会话做成长时间可持续运行的系统。

参考原文：[Learn Claude Code - s06 上下文压缩](https://learn.shareai.run/zh/s06/)

## 一句话理解

`s06` 的核心是：

`上下文总会满，所以必须把旧信息持续压缩出活跃上下文`

也可以记成：

`不是保留一切原文，而是保留继续工作所必需的信息`

## 为什么需要上下文压缩

前面几章里，Agent 已经越来越强了：

- `s01` 能跑循环
- `s02` 能用多个工具
- `s03` 能维护计划
- `s04` 能拆子任务
- `s05` 能按需加载技能

但随之而来的问题也越来越明显：

- 读文件会产生大段文本
- 跑命令会产生长输出
- 工具结果会不断堆进 `messages`
- 会话越长，上下文越胖

很快就会出现一个现实限制：

`上下文窗口不是无限的`

如果不做压缩，Agent 在大项目里工作一段时间后，就会：

- 超过 token 限制
- 或者即使没超限，也因为上下文过大而变慢、变贵
- 更严重时，真正重要的信息会被大量旧细节稀释

## `s06` 真正解决的核心问题

这一章本质上在解决：

`如何让 Agent 在有限上下文里无限续航`

关键不是“永远不丢信息”，而是：

- 活跃上下文里只保留继续推理最有价值的信息
- 完整历史转移到摘要或归档里
- 必要时还能追溯原始记录

所以压缩不是删除，而是“分层保存”。

## 三层压缩到底是什么

`s06` 给出的不是一种压缩，而是三层压缩，强度逐步增加：

1. `micro-compact`
2. `auto-compact`
3. `manual compact`

你可以把它理解成：

- 第一层：日常轻量清理
- 第二层：达到阈值后大规模收缩
- 第三层：模型或系统主动触发压缩

## 第一层：`micro-compact`

这一层是最轻量、最频繁的。

它通常在每次调用模型前都执行，目标是：

`把太旧、太长的 tool_result 替换成短占位符`

例如原本有一个很长的工具结果：

```txt
{
  type: "tool_result",
  content: "...一大段文件内容或命令输出..."
}
```

过了几轮之后，它就可能被替换成：

```txt
[Previous: used read_file]
```

这样做的意义在于：

- 最新几轮细节还保留
- 更早的工具输出被浓缩
- 模型知道“之前做过这件事”
- 但不会继续为旧的大段文本付上下文成本

## 为什么 `micro-compact` 很有效

因为在很多会话里，真正重要的不是旧输出全文，而是：

- 之前用过什么工具
- 做过哪类操作
- 大概发生过什么

举个例子：

如果 8 轮前读过一个文件，现在模型通常并不需要再看到那 300 行原文。  
它只需要知道：

- 之前已经读过
- 那是 `read_file` 的结果
- 如果真要细看，可以再次读取

这就是 `micro-compact` 的核心价值。

## 一个简化版 `micro-compact`

```ts
type Message = {
  role: "user" | "assistant";
  content: unknown;
};

type ToolResultPart = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  tool_name?: string;
};

function microCompact(messages: Message[], keepRecent = 3) {
  const toolResults: ToolResultPart[] = [];

  for (const message of messages) {
    if (message.role !== "user" || !Array.isArray(message.content)) continue;

    for (const part of message.content) {
      if (
        typeof part === "object" &&
        part &&
        (part as ToolResultPart).type === "tool_result"
      ) {
        toolResults.push(part as ToolResultPart);
      }
    }
  }

  if (toolResults.length <= keepRecent) return messages;

  for (const part of toolResults.slice(0, -keepRecent)) {
    if (part.content.length > 100) {
      part.content = `[Previous: used ${part.tool_name ?? "tool"}]`;
    }
  }

  return messages;
}
```

这段代码体现的重点不是某个字段名，而是这个策略：

`旧工具结果不再保留全文，只保留存在感`

## 第二层：`auto-compact`

这一层比第一层激进得多。

它会在上下文达到某个阈值时触发，比如：

- token 估算超过 50k
- 或者接近模型上下文上限的一定比例

触发后，系统会做两件事：

1. 先把完整历史保存到磁盘
2. 再让模型把当前对话总结成一个摘要

然后用这个摘要替换掉原来的大段 `messages`

这就是“大压缩”。

## 为什么 `auto-compact` 前要先归档

因为大压缩一旦发生，原始对话就不会再停留在活跃上下文里。  
如果不先保存，很多细节就真的没了。

所以标准做法是：

- 先把全量 transcript 写到 `.transcripts/`
- 再进行摘要替换

这样得到的是：

- 活跃上下文更短
- 完整历史仍然可追溯

这也是为什么 `s06` 说“信息没有真正丢失，只是移出了活跃上下文”。

## `auto-compact` 的核心动作

你可以把它理解成：

`archive first, summarize second, replace third`

也就是：

1. 归档原始消息
2. 调模型生成连续性摘要
3. 用摘要重建一个更小的上下文

## 一个简化版 `auto-compact`

```ts
async function autoCompact(messages: Message[]) {
  const transcriptPath = `.transcripts/transcript-${Date.now()}.jsonl`;

  const serialized = messages
    .map((message) => JSON.stringify(message))
    .join("\n");

  await Bun.write(transcriptPath, serialized);

  const summaryResponse = await callModel({
    messages: [
      {
        role: "user",
        content:
          "Summarize this conversation for continuity:\n\n" +
          serialized.slice(0, 80000),
      },
    ],
  });

  const summaryText = extractText(summaryResponse.content);

  return [
    {
      role: "user",
      content: `[Compressed]\n\n${summaryText}`,
    },
    {
      role: "assistant",
      content: "Understood. Continuing.",
    },
  ] satisfies Message[];
}
```

这里最值得你抓住的是：

- 压缩后不是空白重开
- 而是留下“连续性摘要”
- 这个摘要是为了让模型继续工作，而不是为了给人读

## 为什么压缩摘要必须强调“continuity”

因为普通摘要容易只总结主题，却丢掉对继续执行最关键的信息。

一个好的上下文压缩摘要，应该尽量保留：

- 当前目标
- 已完成事项
- 未完成事项
- 关键结论
- 重要约束
- 还没解决的风险

也就是说，它不是“文章摘要”，而是“接力摘要”。

目的是让下一轮模型能无缝接棒。

## 第三层：`manual compact`

前两层里：

- 第一层是静默自动发生
- 第二层是阈值自动触发

第三层则是显式触发。

也就是系统提供一个 `compact` 工具，让模型在觉得“上下文该收缩了”的时候主动调用。

这个工具本质上通常还是调用同一套 `autoCompact()` 逻辑，只不过触发方式不同。

## 为什么还需要手动压缩

因为 token 阈值并不总能准确反映“现在是不是该压缩”。

比如：

- 当前任务阶段已经切换
- 前一大段探索已经结束
- 现在准备进入全新子问题

这时即使 token 还没超阈值，也可能值得提前压缩。

所以 `manual compact` 的价值是：

`让模型能根据任务阶段主动整理上下文`

## 三层压缩是如何串起来的

整体流程可以概括成这样：

```ts
while (true) {
  microCompact(messages);

  if (estimateTokens(messages) > THRESHOLD) {
    messages = await autoCompact(messages);
  }

  const response = await callModel({ messages });

  // 执行工具...

  if (usedCompactTool) {
    messages = await autoCompact(messages);
  }
}
```

也就是说：

- 每轮先做轻量瘦身
- 太大了就自动大压缩
- 有需要时也可以手动大压缩

## 为什么 `micro-compact` 和 `auto-compact` 不能互相替代

因为它们解决的是不同层级的问题。

### `micro-compact`

解决的是：

- 小幅度、持续性的膨胀
- 日常旧工具结果的冗余

### `auto-compact`

解决的是：

- 整体上下文已经太大
- 必须进行一次全局收缩

所以最合理的方式不是二选一，而是同时拥有两层。

## transcript 为什么重要

很多人会把压缩理解成“摘要完就完了”，但如果没有 transcript，系统就失去了：

- 审计能力
- 恢复能力
- 调试能力
- 回溯能力

而 transcript 的存在意味着：

- 活跃上下文被压小了
- 但历史没有真正消失
- 需要的时候可以重新查看原始记录

这对长期运行 Agent 很关键。

## 和 `s04 子 Agent` 的关系

你可以把这两章连起来理解：

- `s04` 通过子 Agent 减少主上下文污染
- `s06` 通过压缩控制单个上下文的体积

前者是在做“结构隔离”，后者是在做“容量管理”。

两者结合起来，效果会非常好：

- 能拆出去的脏活交给子 Agent
- 留在本上下文里的旧内容继续被压缩

这样上下文增长速度会大幅下降。

## 和 `s07 任务系统` 的关系

这点也很关键。

一旦有了压缩，你就会发现：

- 只保存在内存里的计划容易丢
- 长期状态不能只依赖会话消息

这正是为什么 `s07` 会把任务状态持久化到磁盘。

你可以把它们理解成配套设计：

- `s06` 负责让上下文活下来
- `s07` 负责让关键状态活下来

## 一个接近完整的最小结构

```ts
type Message = {
  role: "user" | "assistant";
  content: unknown;
};

function estimateTokens(messages: Message[]) {
  return JSON.stringify(messages).length / 4;
}

async function compactConversation(messages: Message[]) {
  const transcriptPath = `.transcripts/transcript-${Date.now()}.jsonl`;
  await Bun.write(
    transcriptPath,
    messages.map((m) => JSON.stringify(m)).join("\n"),
  );

  const response = await callModel({
    messages: [
      {
        role: "user",
        content:
          "Summarize this conversation for continuity. Preserve goals, completed work, pending work, constraints, and key findings.\n\n" +
          JSON.stringify(messages).slice(0, 80000),
      },
    ],
  });

  return [
    {
      role: "user",
      content: `[Compressed]\n\n${extractText(response.content)}`,
    },
    {
      role: "assistant",
      content: "Understood. Continuing.",
    },
  ] satisfies Message[];
}

async function agentLoop(messages: Message[]) {
  while (true) {
    microCompact(messages);

    if (estimateTokens(messages) > 50000) {
      messages = await compactConversation(messages);
    }

    const response = await callModel({ messages });

    messages.push({
      role: "assistant",
      content: response.content,
    });

    if (response.stop_reason !== "tool_use") {
      return response;
    }

    // ...执行工具...

    if (usedCompactTool(response)) {
      messages = await compactConversation(messages);
    }
  }
}
```

这段代码已经能很好体现 `s06` 的工程骨架。

## 这一章最值得学的工程观念

`s06` 最重要的不是“会不会写 compact 工具”，而是这几个工程心法：

- 上下文是一种稀缺资源
- 旧细节不该永远霸占活跃上下文
- 压缩不是丢弃，而是分层保留
- 长期运行系统必须有归档能力
- 摘要必须服务“继续执行”，而不只是服务“读起来简短”

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 4 步来：

1. 先做 `microCompact()`，只替换旧工具结果
2. 再做 transcript 归档
3. 然后实现 `autoCompact()` 生成连续性摘要
4. 最后再加显式 `compact` 工具

这样你会更容易理解三层压缩各自解决什么问题。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Read many files one by one and observe old tool results getting shortened`
2. `Keep exploring until automatic compaction becomes necessary`
3. `Use the compact tool manually before switching to a new phase`
4. `Compare behavior with and without transcript archival`

练习时重点观察一件事：

`如果没有压缩，Agent 是否会越来越臃肿；有了分层压缩后，是否能更久地保持清晰和可持续`

## 结论

`s06` 想让你建立的核心意识是：

上下文不是仓库，不能无限囤积所有历史原文。  
对于一个长期运行的 Agent，真正重要的是把“继续工作所必需的信息”留在活跃上下文里，把其余内容压缩、归档、可追溯地移出去。

换成一句最容易记的话就是：

`Keep the session small, keep the history recoverable, keep the work continuous.`
