# Stream 事件理解笔记

## 背景

从原始手写 agent loop 切到 `ai` 包的 `streamText()` 之后，最容易卡住的地方有两个：

1. 以前直接看完整 `response`，现在要看一串 `event`
2. 以前手动 `messages.push(...)`，现在不再直接改运行时 `messages`

这份笔记的目标，是把这两套心智模型对应起来。

## 原始写法的心智模型

原始写法里，`process()` 通常做这些事：

1. 调模型，拿到 `response`
2. 把 assistant response `push` 到 `messages`
3. 如果遇到 `tool_use`，执行工具
4. 把 `tool_result` 再 `push` 到 `messages`
5. 返回 `continue` 或 `stop`

可以把它理解成：

```ts
LLM -> response
我解析 response
我执行 tool
我把 tool_result 塞回 messages
我决定下一轮要不要继续
```

这里的 `messages` 是在线工作内存，每次都被原地追加。

## 使用 ai 包后的心智模型

现在 `LLM.stream()` 底层调用的是 `streamText(...)`。

这时发生了一个关键变化：

- `ai` 包接管了 tool loop 的运行时编排
- 业务代码改为消费 `fullStream` 里的事件
- 会话状态不再主要靠直接 `push messages` 维护，而是先落成 session parts

可以把新版理解成：

```ts
streamText(...)
  -> 持续产出 event
  -> 内部处理 tool call / tool result / 继续推理

processor.process(...)
  -> 消费 event
  -> 更新 session/message/part
  -> 最后归约成 continue | stop | compact
```

## 事件驱动视角

理解新版 `process()`，最好从事件入手，而不是从完整 response 入手。

需要问每个事件三个问题：

1. 它什么时候来
2. 来了之后更新了什么状态
3. 它会不会影响最后返回 `continue`、`stop`、`compact`

## 事件五大类

### 1. 生命周期类：这一步到哪了

- `start`
- `start-step`
- `finish-step`
- `finish`

这类事件描述的是一次 step 的阶段变化。

其中最重要的是：

- `start-step`：这一轮 step 真正开始
- `finish-step`：这一轮 step 真正结束，并带有 `finishReason`、token、cost 等结算信息

### 2. 文本类：assistant 说了什么

- `text-start`
- `text-delta`
- `text-end`

这类事件会创建并增量更新文本 part。

### 3. 推理类：assistant 想了什么

- `reasoning-start`
- `reasoning-delta`
- `reasoning-end`

这类和文本类很像，只是写入的是 reasoning part。

### 4. 工具类：assistant 做了什么

- `tool-input-start`
- `tool-input-delta`
- `tool-input-end`
- `tool-call`
- `tool-result`
- `tool-error`

可以把它们压缩成三段来理解：

1. `tool-input-*`
   表示工具输入正在形成
2. `tool-call`
   表示工具调用已经确定，准备执行
3. `tool-result` / `tool-error`
   表示工具执行结束

### 5. 控制类：下一步还跑不跑

严格说这类不完全是独立事件，而是由事件流累计出来的控制信号。

主要看这些来源：

- `error`
- `tool-error` 中的特殊错误
- `finish-step` 期间可能设置的 `needsCompaction`

最后统一收敛为：

- `continue`
- `stop`
- `compact`

## 时序怎么理解

如果按理解顺序，可以记成：

1. 生命周期类
2. 推理类
3. 工具类
4. 文本类
5. 控制类

如果按代码阅读顺序，也可以记成：

1. 生命周期类
2. 推理类 / 文本类
3. 工具类
4. 控制类

最重要的是：

- 生命周期类提供骨架
- 推理/文本/工具类属于过程事件
- 控制类放在最后统一决定这一轮怎么收尾

## 对旧写法最关键的两个对应关系

旧写法最关键的两次 `messages.push(...)` 是：

```ts
input.messages.push({
  role: "assistant",
  content: response.content,
})
```

和

```ts
input.messages.push({
  role: "user",
  content: results,
})
```

### 对应关系 1：assistant response 的 push 去哪了

旧版里：

- LLM 返回内容
- 你手动把 assistant message 塞回 `messages`

新版里：

- `text-*` / `reasoning-*` / `tool-*` 先被写成 session parts
- 到下一轮时，再通过 `MessageV2.toModelMessages(...)` 重建成模型输入

所以可以记成：

- 旧版：`push assistant message`
- 新版：`先写 assistant parts，下一轮再 rebuild`

### 对应关系 2：tool result 的 push 去哪了

旧版里：

- 识别 `tool_use`
- 执行工具
- 手动把 `tool_result` `push` 回 `messages`

新版里：

- `ai` 包在一次 `streamText()` 调用内部处理 tool loop
- tool result 会在运行时内部回填给模型
- 业务侧只消费 `tool-result` / `tool-error` 事件并落库
- 下一轮如果还要重建上下文，再由 `toModelMessages(...)` 组装回模型输入

所以可以记成：

- 旧版：`push tool_result message`
- 新版：`运行时由 ai 包回填，持久化侧写成 tool part`

## tool-call 该怎么理解

`tool-call` 不是“也许要调工具”的草稿事件。

更准确地说，它表示：

- 这个工具调用已经成型
- 运行时准备执行它

从 `processor` 的视角看：

- 它更像一个通知事件
- 同时也是一个状态边界，表示 tool part 从 `pending` 进入 `running`

你可以这样理解：

- `tool-input-*`：准备阶段
- `tool-call`：发起执行
- `tool-result` / `tool-error`：执行完成

## 确认时机怎么理解

使用 `ai` 包后，确认不再发生在“你解析到 `tool_use` 的那一刻”。

现在的确认时机更准确地说是：

- `tool-call` 之后
- 工具真正执行过程中
- `tool-result` / `tool-error` 之前

也就是说，确认属于 tool execution 的一部分，而不是 response parsing 的一部分。

链路可以理解成：

1. 模型产出工具调用
2. `ai` 包发出 `tool-call`
3. `ai` 包开始执行 tool
4. tool 内部如果需要确认，就调用权限/问题系统
5. 同意后返回 `tool-result`
6. 拒绝后返回 `tool-error`

## opencode 对确认的处理方式

`opencode` 没有在 `processor` 这一层拦截 `tool-call`。

它的做法是：

1. 在 tool context 里提供 `ask(...)`
2. tool 执行过程中需要确认时，调用 `PermissionNext.ask(...)` 或 `Question.ask(...)`
3. 这些调用会发布：
   - `permission.asked`
   - `question.asked`
4. UI/TUI 订阅这些领域事件，展示确认交互
5. 用户回复后，工具执行继续或失败

所以确认的控制点不在 `processor`，而是在 tool execute 内部。

## ai 包控制了什么，业务代码又控制了什么

### ai 包控制的内容

- tool call 的运行时编排
- tool result 何时回填给模型
- 一次 `streamText()` 内部如何继续推理
- `fullStream` 以什么粒度发出事件

### 业务代码仍然控制的内容

- 暴露哪些 tools
- 每个 tool 的 `execute` 逻辑
- 哪些操作需要确认
- 什么时候调用 `PermissionNext.ask()` / `Question.ask()`
- 如何消费 `tool-result` / `tool-error`
- 最终如何决定 `continue` / `stop` / `compact`

所以不是“全部不可控”，而是：

- 调度层交给了 `ai` 包
- 策略层和状态层仍然由业务控制

## process() 的本质职责

`process()` 的职责不是简单拿一个完整 response 做判断。

它更像一个基于事件流的 reducer：

1. 消费 `stream.fullStream`
2. 根据不同 event 更新 session parts 和内部状态
3. 最终归约出：
   - `continue`
   - `stop`
   - `compact`

更精确地说，它是：

`基于事件流做状态归约的 step processor`

## compact / stop / continue 是怎么得出来的

`process()` 最终并不是直接看一个字段决定结果，而是看整轮事件累计出来的状态。

关键状态包括：

- `needsCompaction`
- `blocked`
- `assistantMessage.error`

最后大致收敛为：

- `needsCompaction` -> `compact`
- `blocked` 或有 error -> `stop`
- 否则 -> `continue`

## snapshot 是什么

`snapshot` 不是对话快照，而是工作区文件状态快照。

它本质上是一个内部 git tree hash，用来表示某一时刻的文件系统状态。

主要用途：

1. 记录 step 前后的文件基线
2. 计算这一轮改动了哪些文件
3. 支撑后续的 revert / restore 能力

如果当前只是迭代 `stream` 事件设计，完全可以先忽略它。

它更偏“工程化增强能力”，不是理解 agent/tool loop 的核心主干。

## 为什么会有“补记工具失败”的兜底逻辑

有一段逻辑会在流结束后，把仍然处于 `pending` / `running` 的 tool part 统一标成：

- `status: "error"`
- `error: "Tool execution aborted"`

这段逻辑的目的，是避免会话里留下永远不收尾的工具调用状态。

它可以理解成：

- 正常路径：`tool-call -> tool-result/tool-error`
- 异常路径：流提前结束，tool 没正常收尾
- 兜底逻辑：统一把悬空的 tool 标记为 aborted

## 最终的核心心智模型

如果要把旧模型和新模型压成一句话：

- 旧版：你手动维护 `messages`，并手动推进 tool loop
- 新版：`ai` 包维护运行时 tool loop，你消费事件并维护持久化会话状态

或者再具体一点：

- 旧版的 `messages.push(...)`
  在新版里主要被拆成：
  - `ai` 包内部运行时上下文推进
  - `Session.updatePart(...)`
  - 下一轮的 `toModelMessages(...)` 重建

这是从“response 驱动”到“event 驱动”的核心切换。
