# OpenCode 风格 ReAct Loop 教学改造指南

这份文档的目标很简单：

- 把一个教科书式的单函数 ReAct loop
- 拆解成更接近 `opencode` 的工程化实现
- 帮助理解 `loop`、`process`、`LLM.stream` 三层各自负责什么

## 1. 一个典型的教学版 ReAct Loop

很多教程里的 Agent Loop 大致长这样：

```ts
export async function agentLoop(
  prompt: string,
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.MessageParam[]> {
  messages.push({
    role: "user",
    content: prompt,
  })

  while (true) {
    const response = await AUTH.messages.create({
      model: MODEL,
      system: SYSTEM,
      messages,
      tools: TOOLS,
      max_tokens: 8000,
    })

    messages.push({
      role: "assistant",
      content: response.content,
    })

    if (response.stop_reason !== "tool_use") {
      break
    }

    const results: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type === "tool_use") {
        let output: string
        try {
          output = await bash(block.input)
        } catch (err) {
          output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`
        }

        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: output,
        })
      }
    }

    messages.push({
      role: "user",
      content: results,
    })
  }

  return messages
}
```

这个版本很适合教学，因为所有逻辑都放在一个函数里：

1. 塞入用户输入
2. 调模型
3. 看是否触发工具
4. 执行工具
5. 把工具结果塞回消息
6. 再来一轮

这就是一个标准的 ReAct loop。

## 2. OpenCode 的关键区别

`opencode` 没有放弃 ReAct loop，而是把它拆成了两层：

- 外层 `SessionPrompt.loop(...)`
  - 负责主回合循环
  - 决定是否继续、停止、或压缩上下文
- 内层 `SessionProcessor.process(...)`
  - 负责单轮模型执行
  - 消费流式事件
  - 处理文本、reasoning、tool call、tool result

还多了一层：

- `LLM.stream(...)`
  - 真正向模型发请求
  - 返回流式事件，而不是一次性的 `response.content`

所以教学版的“单函数 loop”，在 `opencode` 里被工程化拆成了：

```txt
SessionPrompt.loop
  -> SessionProcessor.process
    -> LLM.stream
```

## 3. 先把教学版改造成两层

### 3.1 外层 loop

```ts
export async function loop(
  prompt: string,
  messages: Message[]
): Promise<Message[]> {
  messages.push({
    role: "user",
    content: prompt,
  })

  while (true) {
    const result = await process({
      messages,
      model: MODEL,
      system: SYSTEM,
      tools: TOOLS,
    })

    if (result.type === "stop") {
      break
    }

    if (result.type === "continue") {
      continue
    }
  }

  return messages
}
```

### 3.2 内层 process

```ts
async function process(input: {
  messages: Message[]
  model: string
  system: string
  tools: Tool[]
}): Promise<{ type: "continue" | "stop" }> {
  const response = await AUTH.messages.create({
    model: input.model,
    system: input.system,
    messages: input.messages,
    tools: input.tools,
    max_tokens: 8000,
  })

  input.messages.push({
    role: "assistant",
    content: response.content,
  })

  if (response.stop_reason !== "tool_use") {
    return { type: "stop" }
  }

  const results: ToolResult[] = []

  for (const block of response.content) {
    if (block.type !== "tool_use") continue

    let output: string

    try {
      output = await bash(block.input)
    } catch (err) {
      output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`
    }

    results.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: output,
    })
  }

  input.messages.push({
    role: "user",
    content: results,
  })

  return { type: "continue" }
}
```

这一步的意义是先看清：

- `loop` 是主循环
- `process` 是单轮执行

这正是理解 `opencode` 的第一步。

## 4. 再把它改造成 OpenCode 风格

上面的版本仍然过于“教程化”，因为它依赖一个内存中的 `messages[]` 数组。

`opencode` 更像是：

- 先把消息写进 session store
- 再从 store 读取完整历史
- 把历史转成模型输入
- 把工具结果和文本结果写回 message parts
- 下一轮重新从 store 构造上下文

### 4.1 外层 loop：每轮重新读取状态

```ts
export async function loop(session: Session, prompt: string) {
  await createUserMessage(session, prompt)

  while (true) {
    const messages = await loadMessages(session.id)
    const lastUser = findLastUser(messages)

    const result = await process({
      session,
      user: lastUser,
      messages,
      model: MODEL,
      system: SYSTEM,
      tools: TOOLS,
    })

    if (result === "stop") {
      break
    }

    if (result === "continue") {
      continue
    }
  }

  return await loadMessages(session.id)
}
```

这里已经很接近 `SessionPrompt.loop(...)` 了：

- 每轮都重新读取消息
- 每轮都根据最新状态继续
- 而不是只对一个本地数组不停 `push`

### 4.2 内层 process：只负责一轮

```ts
async function process(input: {
  session: Session
  user: Message
  messages: Message[]
  model: string
  system: string
  tools: Tool[]
}): Promise<"continue" | "stop"> {
  const response = await AUTH.messages.create({
    model: input.model,
    system: input.system,
    messages: toModelMessages(input.messages),
    tools: input.tools,
    max_tokens: 8000,
  })

  const assistant = {
    id: createID(),
    role: "assistant" as const,
    content: response.content,
  }

  await saveMessage(input.session.id, assistant)

  if (response.stop_reason !== "tool_use") {
    return "stop"
  }

  const toolResults: ToolResult[] = []

  for (const block of response.content) {
    if (block.type !== "tool_use") continue

    let output: string

    try {
      output = await bash(block.input)
    } catch (err) {
      output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`
    }

    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: output,
    })
  }

  await saveMessage(input.session.id, {
    id: createID(),
    role: "user",
    content: toolResults,
  })

  return "continue"
}
```

这已经表达出了 `opencode` 的核心设计：

- 一轮只负责一轮
- 工具结果不只是塞进数组
- 而是变成 session 历史的一部分

## 5. OpenCode 再往前走了一步：流式事件

真正的 `opencode` 不是拿到完整响应后再扫 `response.content`，而是直接消费流式事件：

```ts
const stream = await LLM.stream(...)

for await (const event of stream.fullStream) {
  switch (event.type) {
    case "text-start":
    case "text-delta":
    case "text-end":
    case "tool-call":
    case "tool-result":
    case "reasoning-start":
    case "reasoning-delta":
    case "reasoning-end":
      ...
  }
}
```

这一步对应的是：

- 文本输出实时写入
- reasoning 实时写入
- tool 状态从 `pending -> running -> completed/error`
- patch、snapshot、usage、cost 在 step 边界记录

因此，教学版里的：

```ts
const response = await AUTH.messages.create(...)
```

在 `opencode` 里更接近：

```ts
const result = await processor.process(...)
```

而 `processor.process(...)` 内部再去做：

```ts
const stream = await LLM.stream(...)
for await (const event of stream.fullStream) {
  ...
}
```

## 6. OpenCode 风格的完整教学伪代码

下面是一版最接近 `opencode` 的教学伪代码。

### 6.1 外层：主 ReAct loop

```ts
export async function loop(sessionID: string, prompt: string) {
  await createUserMessage(sessionID, prompt)

  while (true) {
    const messages = await loadMessages(sessionID)
    const lastUser = findLastUser(messages)
    const tools = await resolveTools(lastUser)
    const assistant = await createAssistantMessage(sessionID, lastUser)

    const result = await process({
      sessionID,
      user: lastUser,
      assistant,
      messages,
      tools,
      model: MODEL,
      system: SYSTEM,
    })

    if (result === "stop") {
      break
    }

    if (result === "compact") {
      await compact(sessionID)
      continue
    }

    if (result === "continue") {
      continue
    }
  }
}
```

### 6.2 内层：单轮执行器

```ts
async function process(input: {
  sessionID: string
  user: Message
  assistant: Message
  messages: Message[]
  tools: Tool[]
  model: string
  system: string
}): Promise<"continue" | "stop" | "compact"> {
  while (true) {
    try {
      const stream = await LLM.stream({
        model: input.model,
        system: input.system,
        messages: toModelMessages(input.messages),
        tools: input.tools,
      })

      for await (const event of stream.fullStream) {
        switch (event.type) {
          case "text-start":
            await createTextPart(input.assistant.id)
            break

          case "text-delta":
            await appendTextPart(input.assistant.id, event.text)
            break

          case "tool-call":
            await createRunningToolPart(input.assistant.id, event)
            break

          case "tool-result":
            await completeToolPart(input.assistant.id, event)
            break

          case "finish-step":
            await finalizeAssistantMessage(input.assistant.id, event)
            break
        }
      }

      return "continue"
    } catch (err) {
      if (isRetryable(err)) {
        await sleep(retryDelay(err))
        continue
      }

      await saveError(input.assistant.id, err)
      return "stop"
    }
  }
}
```

这里最值得注意的是：

- 外层 `loop` 是 ReAct 主循环
- 内层 `process` 的 `while (true)` 是 retry shell
- 它不是主 ReAct loop

## 7. 最容易混淆的点

### 7.1 为什么 `process` 看起来也像 loop

因为 `process` 里也会：

- 收到 tool call
- 执行工具
- 更新 tool result

所以表面上看像在“继续 agent 行为”。

但严格说：

- `process` 只负责当前这一轮模型调用
- 下一轮是否继续，是外层 `loop` 决定的

### 7.2 `process` 里的 `while (true)` 到底是什么

它主要是：

- 单轮流式调用的重试循环
- 容错壳

不是主 ReAct loop。

换句话说：

- `SessionPrompt.loop(...)` 是主业务循环
- `SessionProcessor.process(...).while(true)` 是单轮执行的 retry loop

## 8. 一张心智图

```txt
用户输入
  -> createUserMessage
  -> SessionPrompt.loop
      -> 读取最新消息历史
      -> 选择 agent / model / tools
      -> SessionProcessor.process
          -> LLM.stream
          -> 消费 text / reasoning / tool-call / tool-result 事件
          -> 返回 continue / stop / compact
      -> 根据返回值决定下一轮
```

## 9. 一句话总结

教学版 ReAct loop 和 `opencode` 的本质完全一样，只是 `opencode` 把它工程化拆成了三层：

- `loop` 负责主回合循环
- `process` 负责单轮执行
- `LLM.stream` 负责实际模型调用与事件流

所以，如果你能看懂教学版的：

```ts
while (true) {
  const response = await model(...)
  if (response.stop_reason !== "tool_use") break
  const results = await runTools(...)
  messages.push(toolResults)
}
```

那你就已经理解了 `opencode` 的骨架。只是它把这段逻辑拆成了更适合真实产品的分层实现。
