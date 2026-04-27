# s08 后台任务

本文基于 Learn Claude Code 的 `s08` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么慢操作不能一直阻塞主循环，以及 Agent 如何通过“后台执行 + 通知回流”获得并发能力。

参考原文：[Learn Claude Code - s08 后台任务](https://learn.shareai.run/zh/s08/)

## 一句话理解

`s08` 的核心是：

`把慢操作丢到后台跑，主 Agent 继续推进别的事`

也可以记成：

`主循环不并行推理，只并行等待 I/O`

这句话非常重要，因为它点出了这一章真正的边界。

## 为什么需要后台任务

前面几章已经让 Agent 拥有了很强的规划和执行能力，但主循环仍然有一个明显问题：

`只要某个工具很慢，整个 Agent 就得卡住等它`

典型的慢操作包括：

- `npm install`
- `bun install`
- `pytest`
- `docker build`
- 大型代码生成
- 长时间网络请求

如果这些任务都用阻塞方式执行，会出现这些问题：

- 模型不能继续思考下一步
- 其他可以并行做的事情被迫等待
- 用户体验很差
- 整个 Agent 看起来像“卡住了”

所以 `s08` 的目标不是让一切都并发，而是：

`把适合后台化的慢操作从主循环里拆出去`

## `s08` 真正解决的核心问题

这一章本质上在解决：

`主循环如何在不失去控制的前提下，让慢操作异步完成`

重点有两个：

1. 慢任务要能后台运行
2. 结果完成后要能重新回到主消息流里

也就是：

- 不是单纯“开线程就完了”
- 而是要让后台结果最终变成 Agent 能理解的新输入

这就是“通知回流”的意义。

## 最重要的工程边界

很多人看到并发，第一反应是“是不是主循环也多线程了？”

不是。

`s08` 的关键设计是：

- 主 Agent 循环仍然是单线程
- 只有慢速工具执行被放到后台
- 后台完成后，通过通知队列回流结果

所以最准确的理解是：

`并发的是外部执行，不是主决策循环`

这能大幅降低复杂度。

## 一个典型时间线

比如用户说：

`先安装依赖，再顺手生成一个配置文件`

没有后台任务时，流程通常会变成：

1. 执行安装依赖
2. 原地等待
3. 装完后再生成配置

而有了后台任务后，可以变成：

1. 后台启动安装依赖
2. 主循环继续生成配置文件
3. 下一轮调用模型前收取后台结果
4. 再根据结果做下一步判断

这就是 `s08` 的价值。

## BackgroundManager 是什么

你可以把它理解成一个后台任务协调器。

它主要做 4 件事：

1. 创建后台任务
2. 跟踪任务状态
3. 收集完成结果
4. 提供通知队列给主循环排空

注意，重点不只是“跑任务”，而是“让结果回来”。

## 一个最小的背景任务数据结构

```ts
type BackgroundTaskStatus = "running" | "completed" | "failed";

type BackgroundTask = {
  id: string;
  command: string;
  status: BackgroundTaskStatus;
  result?: string;
  error?: string;
};

type BackgroundNotification = {
  taskId: string;
  result: string;
};
```

这里最关键的是两样东西：

- `tasks`
  存正在跟踪的后台任务
- `notifications`
  存已经完成、等待主循环消费的结果

## 为什么需要通知队列

因为后台线程完成任务时，主循环可能此刻并不在等它。

所以后台线程不能直接“插话”，更合理的做法是：

1. 后台线程把结果放进队列
2. 主循环在下一次调用模型前统一排空队列
3. 把这些结果注入消息流

这保证了系统依然是可控、可预测的。

你可以把它理解成：

- 后台线程负责产出结果
- 主循环负责消费结果

## 一个最小的 BackgroundManager

```ts
class BackgroundManager {
  private tasks = new Map<string, BackgroundTask>();
  private notifications: BackgroundNotification[] = [];
}
```

继续往下看，最关键的是它的 `run()`、`execute()` 和 `drainNotifications()`。

## `run()` 做了什么

它的职责是：

1. 生成任务 ID
2. 记录任务状态为 `running`
3. 启动后台执行
4. 立即返回，不阻塞主循环

示意代码：

```ts
class BackgroundManager {
  private tasks = new Map<string, BackgroundTask>();
  private notifications: BackgroundNotification[] = [];

  run(command: string) {
    const id = crypto.randomUUID().slice(0, 8);

    this.tasks.set(id, {
      id,
      command,
      status: "running",
    });

    this.execute(id, command);

    return `Background task ${id} started`;
  }
}
```

最重要的是：

`run()` 不是等任务跑完，而是只负责“发车”。

## `execute()` 做了什么

它负责真正跑命令，并在完成后把结果塞进通知队列。

在 Bun + TypeScript 里，一个简化思路可以是：

```ts
class BackgroundManager {
  private async execute(taskId: string, command: string) {
    try {
      const proc = Bun.spawn(["sh", "-lc", command], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      const result = (stdout + stderr).trim().slice(0, 50000);

      this.tasks.set(taskId, {
        id: taskId,
        command,
        status: exitCode === 0 ? "completed" : "failed",
        result,
      });

      this.notifications.push({
        taskId,
        result: result.slice(0, 500),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.tasks.set(taskId, {
        id: taskId,
        command,
        status: "failed",
        error: message,
      });

      this.notifications.push({
        taskId,
        result: `Error: ${message}`,
      });
    }
  }
}
```

这段代码体现了 `s08` 最关键的闭环：

- 后台跑
- 状态更新
- 结果入队

## 为什么结果要截断

因为后台任务很可能产生超长输出。

例如：

- 测试日志
- 构建日志
- 安装依赖日志

如果整段原样注入主消息流，刚解决“阻塞问题”，又会引入新的“上下文污染问题”。

所以通常会做两层处理：

- 完整结果保存在任务状态里
- 通知里只放较短摘要

这和 `s06` 的压缩思路其实是互相呼应的。

## `drainNotifications()` 为什么重要

这是后台系统和主循环的接口。

主循环不会不断轮询某一个任务，而是在每次调用模型前统一收通知：

```ts
class BackgroundManager {
  drainNotifications() {
    const items = [...this.notifications];
    this.notifications = [];
    return items;
  }
}
```

它的意义在于：

- 主循环能在固定边界消费后台结果
- 通知只消费一次
- 不会重复把同一结果注入多次

## 主循环怎么接入后台通知

这是 `s08` 最重要的整合点。

在每次调用模型前，先把后台通知排空：

```ts
const notifications = bgManager.drainNotifications();

if (notifications.length > 0) {
  const text = notifications
    .map((item) => `[bg:${item.taskId}] ${item.result}`)
    .join("\n");

  messages.push({
    role: "user",
    content: `<background-results>\n${text}\n</background-results>`,
  });

  messages.push({
    role: "assistant",
    content: "Noted background results.",
  });
}
```

这一步非常关键，因为它把后台完成结果重新变成了模型可见上下文的一部分。

也就是说，主循环虽然没有等待，但它并没有失去结果。

## 为什么要在 LLM 边界前注入通知

因为这样最自然。

如果在别的时机注入，系统会更难维持一致性。  
而在每次模型调用前注入，有几个好处：

- 时机稳定
- 逻辑清晰
- 结果会自然参与下一轮推理

你可以理解成：

`每一轮思考前，先把新世界状态同步给模型`

## 后台任务适合什么场景

特别适合这些慢操作：

- 安装依赖
- 跑测试
- 长时间构建
- 大型代码生成
- 镜像构建
- 较慢的扫描或同步动作

它们有个共同点：

- 结果重要
- 过程通常不需要模型全程盯着
- 运行期间主循环还能做别的事

## 不适合后台化的任务

不是所有工具都应该丢到后台。

不太适合的包括：

- 必须立刻拿结果才能继续的短操作
- 高频小命令
- 对上下文一致性要求特别高的同步修改
- 需要连续交互的动作

因为后台化也会引入额外复杂度：

- 状态跟踪
- 结果回流
- 失败处理
- 用户预期管理

所以它适合“慢且独立”的任务，不适合所有任务。

## 为什么 `s08` 没有把一切都做成并行 Agent

这是很值得你抓住的一点。

`s08` 并不是多 Agent 协作系统，它只是让慢速外部执行脱离主阻塞。

也就是说：

- 决策仍然集中在一个主 Agent
- 并行的是外部 I/O 任务
- 协作层还没有真正展开

所以这章是在为后面的团队协作打基础，而不是直接跳到复杂的多智能体系统。

## 和 `s07 任务系统` 的关系

这两章组合起来会很自然：

- `s07` 负责定义要做哪些任务
- `s08` 负责让某些任务在后台执行

比如：

- 任务图里有 “Run test suite”
- 这个任务就可以由后台执行器启动
- 完成后再把结果通知主 Agent

这时任务系统和后台执行就真正串起来了。

## 和 `s06 上下文压缩` 的关系

后台任务虽然解决了阻塞问题，但也会带来更多输出。  
所以它会进一步强化 `s06` 的必要性。

因为一旦你开始并发跑：

- 测试日志
- 构建日志
- 安装日志

消息流会更快变胖。

所以：

- `s08` 解决“等待”
- `s06` 解决“膨胀”

两者需要一起看。

## 一个接近完整的最小结构

```ts
type BackgroundTaskStatus = "running" | "completed" | "failed";

type BackgroundTask = {
  id: string;
  command: string;
  status: BackgroundTaskStatus;
  result?: string;
  error?: string;
};

type BackgroundNotification = {
  taskId: string;
  result: string;
};

class BackgroundManager {
  private tasks = new Map<string, BackgroundTask>();
  private notifications: BackgroundNotification[] = [];

  run(command: string) {
    const id = crypto.randomUUID().slice(0, 8);

    this.tasks.set(id, {
      id,
      command,
      status: "running",
    });

    void this.execute(id, command);
    return `Background task ${id} started`;
  }

  private async execute(taskId: string, command: string) {
    try {
      const proc = Bun.spawn(["sh", "-lc", command], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      const result = (stdout + stderr).trim().slice(0, 50000);

      this.tasks.set(taskId, {
        id: taskId,
        command,
        status: exitCode === 0 ? "completed" : "failed",
        result,
      });

      this.notifications.push({
        taskId,
        result: result.slice(0, 500),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.tasks.set(taskId, {
        id: taskId,
        command,
        status: "failed",
        error: message,
      });

      this.notifications.push({
        taskId,
        result: `Error: ${message}`,
      });
    }
  }

  drainNotifications() {
    const items = [...this.notifications];
    this.notifications = [];
    return items;
  }
}
```

这就是 `s08` 的核心骨架。

## 把后台工具接进 dispatch map

从前几章一路看下来，你会发现这一章依然没有推翻之前架构。  
它还是通过工具接入：

```ts
const toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: runTodo,
  load_skill: runLoadSkill,
  background_run: async (input) => {
    const command = String(input.command ?? "");
    return bgManager.run(command);
  },
  background_check: async (input) => {
    const taskId = String(input.task_id ?? "");
    return JSON.stringify(bgManager.get(taskId), null, 2);
  },
};
```

真正新增的不是循环，而是：

- 后台管理器
- 通知机制
- 状态查询接口

## 这一章最值得学的工程观念

`s08` 最重要的不是“会不会开后台线程”，而是这几个工程心法：

- 主循环应该尽量保持响应
- 慢 I/O 不该阻塞整体决策
- 后台任务必须可追踪、可回流、可检查
- 并发结果要在稳定边界注入
- 并发不是为了炫技，而是为了提高整体推进效率

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 4 步来：

1. 先实现 `BackgroundManager.run()`
2. 再实现 `drainNotifications()`
3. 然后把后台结果在每轮 LLM 调用前注入
4. 最后再补任务状态查询、超时控制、输出裁剪

这样你会更容易把“后台执行”和“主循环决策”分清楚。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Run "sleep 5 && echo done" in the background, then create a config file`
2. `Start multiple background commands and observe notifications arrive later`
3. `Run tests in the background while continuing other edits`
4. `Compare blocking execution vs background execution for a slow install command`

练习时重点观察一件事：

`如果没有后台任务，主循环是不是总在等；有了后台任务后，Agent 是否能更连续地推进多个目标`

## 结论

`s08` 想让你建立的核心意识是：

Agent 不需要在每个慢操作前停下来发呆。  
真正高效的系统会把慢速外部执行丢到后台，让主循环继续做决策，并在恰当的时机把结果重新同步回来。

换成一句最容易记的话就是：

`Let slow work happen elsewhere, but bring the outcome back into the loop.`
