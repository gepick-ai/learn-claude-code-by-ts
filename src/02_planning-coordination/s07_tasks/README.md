# s07 任务系统

本文基于 Learn Claude Code 的 `s07` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么平面 todo 已经不够用了，以及“持久化任务图”为什么会成为后续多 Agent 协作的骨架。

参考原文：[Learn Claude Code - s07 任务系统](https://learn.shareai.run/zh/s07/)

## 一句话理解

`s07` 的核心是：

`把会话内的平面待办，升级成磁盘上的任务图`

你也可以记成：

`Todo 适合短流程，Task Graph 适合长流程和协作`

## 为什么需要任务系统

到了 `s03`，你已经有了 `TodoWrite`。  
它在单次会话里的多步任务上很好用，但它有几个天然限制：

- 它通常只是一个平面列表
- 缺少明确的先后依赖
- 很难表达并行关系
- 状态一般比较粗
- 它主要活在当前上下文或内存里

这意味着一旦任务变复杂，比如：

- A 做完才能开始 B
- C 和 D 可以并行
- E 要等 C、D 都完成
- 中途上下文压缩了
- 甚至进程重启了

单纯的 todo list 就开始不够用了。

## `s07` 真正解决的核心问题

这一章本质上在解决两件事：

1. `任务之间的关系`
2. `任务状态的持久化`

也就是：

- 不只是“有哪些事要做”
- 而是“哪些事依赖哪些事”
- 以及“这些状态不能只存在于内存里”

这就是为什么 `s07` 从平面清单升级成任务图。

## 什么是任务图

任务图可以理解成：

- 每个任务是一个节点
- 任务之间的依赖是边
- 图里能表达顺序、并行、阻塞和解锁

例如：

```txt
task 1 -> task 2
task 1 -> task 3
task 2 -> task 4
task 3 -> task 4
```

它表达的是：

- `task 1` 先做
- `task 2` 和 `task 3` 可以在 `task 1` 完成后并行
- `task 4` 要等 `task 2`、`task 3` 都完成

这已经不是普通 todo 能自然表达的东西了。

## 为什么任务图比平面 todo 更强

因为它能回答 3 类关键问题：

1. `什么现在可以做？`
2. `什么现在被卡住了？`
3. `什么完成后会解锁后续任务？`

对于长流程 Agent 来说，这 3 个问题非常重要。

如果没有显式依赖关系，模型往往只能“猜”下一步该做什么。  
一旦有任务图，系统就可以更稳定地判断：

- 哪些任务 ready
- 哪些任务 blocked
- 哪些任务 done

## 为什么要持久化到磁盘

这是 `s07` 的另一个关键升级。

前面的 todo 更像运行时状态。  
但从 `s07` 开始，任务要写到磁盘上，比如：

```txt
.tasks/
  task_1.json
  task_2.json
  task_3.json
```

每个任务一个 JSON 文件。

这样做的直接好处是：

- 上下文压缩后状态还在
- 重新启动后状态还在
- 多个 Agent 可以共享同一份任务状态
- 后续可以接后台执行、团队协作、worktree 隔离

所以磁盘持久化不是细节，而是后续系统化协作的前提。

## 和 `s03 TodoWrite` 的关系

你可以这样区分它们：

### `TodoWrite`

更适合：

- 当前会话内
- 较短多步任务
- 快速列计划
- 轻量追踪当前进度

### `Task System`

更适合：

- 长生命周期任务
- 多任务协作
- 有依赖关系的任务
- 需要持久化的执行计划

所以它们不是互斥关系，而是不同层级的规划工具。

## 任务对象最少要有什么

一个任务最少可以有这些字段：

```ts
type TaskStatus = "pending" | "in_progress" | "completed";

type Task = {
  id: number;
  subject: string;
  description: string;
  status: TaskStatus;
  blockedBy: number[];
  blocks: number[];
  owner: string;
};
```

其中最关键的是：

- `status`
- `blockedBy`
- `blocks`

它们共同决定了任务图结构。

## `blockedBy` 和 `blocks` 怎么理解

### `blockedBy`

表示“当前任务被哪些前置任务卡住”

比如：

```ts
{
  id: 4,
  subject: "Run integration tests",
  blockedBy: [2, 3]
}
```

意思就是：

`4 号任务要等 2 和 3 完成`

### `blocks`

表示“当前任务会阻塞哪些后置任务”

比如：

```ts
{
  id: 1,
  subject: "Setup project",
  blocks: [2, 3]
}
```

意思就是：

`1 号任务完成后，会解锁 2 和 3`

你可以只存一侧关系再动态推导另一侧，但 `s07` 的教学重点是让关系显式可见。

## 一个最小 TaskManager

在 TypeScript 里，你可以先从最小文件型管理器开始：

```ts
type TaskStatus = "pending" | "in_progress" | "completed";

type Task = {
  id: number;
  subject: string;
  description: string;
  status: TaskStatus;
  blockedBy: number[];
  blocks: number[];
  owner: string;
};
```

然后实现一个基础类：

```ts
import path from "node:path";

class TaskManager {
  constructor(private tasksDir: string) {}

  private getTaskPath(id: number) {
    return path.join(this.tasksDir, `task_${id}.json`);
  }
}
```

这只是起点，真正重要的是它要负责：

- 创建任务
- 读取任务
- 更新任务
- 列出任务
- 解除依赖

## `create()` 做了什么

最小版的 `create()` 需要：

1. 分配新任务 ID
2. 生成默认状态
3. 写入磁盘

示意代码如下：

```ts
class TaskManager {
  private nextId = 1;

  constructor(private tasksDir: string) {}

  async create(subject: string, description = "") {
    const task: Task = {
      id: this.nextId++,
      subject,
      description,
      status: "pending",
      blockedBy: [],
      blocks: [],
      owner: "",
    };

    await Bun.write(
      path.join(this.tasksDir, `task_${task.id}.json`),
      JSON.stringify(task, null, 2),
    );

    return task;
  }
}
```

这一步的重点不是写文件本身，而是：

`任务不再只是上下文里的文本，而是系统里的真实状态对象`

## `update()` 为什么是核心

任务系统里，最重要的不是创建，而是更新。

因为任务真正的生命流程在这里：

`pending -> in_progress -> completed`

而且更新时还可能伴随：

- 增加依赖
- 移除依赖
- 变更 owner
- 完成后自动解锁下游任务

所以 `update()` 是整个任务图的操作中心。

## 完成任务为什么会“解锁”后续任务

这是任务图最有价值的地方。

比如：

- `task 2` 的 `blockedBy` 是 `[1]`
- `task 3` 的 `blockedBy` 是 `[1]`

当 `task 1` 完成后，你就应该自动把 `1` 从这些任务的 `blockedBy` 里删掉。

这样：

- `task 2` 变成可执行
- `task 3` 变成可执行

这就是“依赖解除”。

## 一个简化的依赖清理逻辑

```ts
async function clearDependency(completedId: number) {
  const tasks = await taskManager.listAll();

  for (const task of tasks) {
    if (!task.blockedBy.includes(completedId)) continue;

    task.blockedBy = task.blockedBy.filter((id) => id !== completedId);
    await taskManager.save(task);
  }
}
```

这段逻辑非常重要，因为它让任务图不是“死数据”，而是会随着完成状态自动演化。

## 一个更接近完整的 `update()`

```ts
async function updateTask(
  taskId: number,
  patch: Partial<Pick<Task, "status" | "owner">>,
) {
  const task = await taskManager.get(taskId);

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const updated: Task = {
    ...task,
    ...patch,
  };

  await taskManager.save(updated);

  if (updated.status === "completed") {
    await clearDependency(updated.id);
  }

  return updated;
}
```

这就是 `s07` 的关键骨架之一。

## 哪些任务可以立即执行

从图的角度看，一个任务可以开始，通常要满足两个条件：

1. `status === "pending"`
2. `blockedBy.length === 0`

你可以写一个辅助函数：

```ts
function isReady(task: Task) {
  return task.status === "pending" && task.blockedBy.length === 0;
}
```

这样系统就能快速判断当前可执行任务。

## “blocked” 是状态还是视图

这是一个很值得你思考的工程问题。

很多实现里不会把 `blocked` 存成真正状态，而是把它当成派生视图：

- 如果任务是 `pending`
- 但 `blockedBy.length > 0`

那它在 UI 或输出上就可以被显示为 `blocked`

这样做的好处是：

- 持久化状态更简单
- 真正的状态机仍然清晰
- `blocked` 只是对依赖关系的解释结果

所以你经常会看到：

- 存储层只有 `pending/in_progress/completed`
- 展示层额外显示 `blocked`

## 为什么文件型任务系统特别适合后续扩展

这是 `s07` 非常重要的一点。

一旦任务存在磁盘里，后续你就可以很自然地接入：

- `s08` 的后台任务
- 多 Agent 协作
- 任务 ownership
- 跨会话恢复
- worktree 隔离

也就是说，`s07` 不是单独一个功能，而是后续协调层的基础设施。

## 把任务工具接进 dispatch map

从架构上看，任务系统依然没有推翻之前的设计。  
它只是继续通过工具接入：

```ts
const toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: runTodo,
  task: runTask,
  load_skill: runLoadSkill,
  task_create: async (input) => {
    const subject = String(input.subject ?? "");
    const description = String(input.description ?? "");
    return JSON.stringify(await taskManager.create(subject, description), null, 2);
  },
  task_update: async (input) => {
    const taskId = Number(input.task_id);
    const status = input.status as TaskStatus | undefined;
    return JSON.stringify(await updateTask(taskId, { status }), null, 2);
  },
  task_list: async () => {
    return JSON.stringify(await taskManager.listAll(), null, 2);
  },
  task_get: async (input) => {
    const taskId = Number(input.task_id);
    return JSON.stringify(await taskManager.get(taskId), null, 2);
  },
};
```

你可以看到，`s07` 依然是基于前面几章的架构继续叠加。

## 和 `s03 TodoWrite` 的分工

一个很实用的理解方式是：

- `TodoWrite` 适合局部推进
- `Task System` 适合全局协作

例如：

- 父 Agent 用任务系统管理长期计划
- 某个子 Agent 在执行单个任务时，内部仍然可以用 todo 维护局部步骤

这样就形成了：

- 上层任务图
- 下层执行清单

这是一种很自然的分层。

## 一个接近完整的最小结构

```ts
type TaskStatus = "pending" | "in_progress" | "completed";

type Task = {
  id: number;
  subject: string;
  description: string;
  status: TaskStatus;
  blockedBy: number[];
  blocks: number[];
  owner: string;
};

class TaskManager {
  private nextId = 1;

  constructor(private tasksDir: string) {}

  async create(subject: string, description = ""): Promise<Task> {
    const task: Task = {
      id: this.nextId++,
      subject,
      description,
      status: "pending",
      blockedBy: [],
      blocks: [],
      owner: "",
    };

    await this.save(task);
    return task;
  }

  async get(taskId: number): Promise<Task | null> {
    const file = Bun.file(path.join(this.tasksDir, `task_${taskId}.json`));
    if (!(await file.exists())) return null;
    return (await file.json()) as Task;
  }

  async save(task: Task) {
    await Bun.write(
      path.join(this.tasksDir, `task_${task.id}.json`),
      JSON.stringify(task, null, 2),
    );
  }

  async listAll(): Promise<Task[]> {
    const files = new Glob(`${this.tasksDir}/task_*.json`);
    return files.tasks;
  }
}
```

上面这段是概念示意，真实实现时你需要自己完成目录扫描和 JSON 读取逻辑，但核心思想已经很清楚：

- 任务是文件
- 状态是结构化字段
- 依赖是显式关系

## 这一章最值得学的工程观念

`s07` 最重要的不是“会不会写 task_create”，而是这几个工程心法：

- 复杂目标必须拆成结构化任务
- 任务之间的关系必须显式化
- 长期状态不能只活在上下文里
- 一旦要协作，就要有共享、持久化的协调层
- 执行顺序和并行性最好由任务图表达，而不是靠模型临场猜

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 4 步来：

1. 先实现 `.tasks/` 目录和 `task_create`
2. 再实现 `task_get`、`task_list`
3. 然后加 `blockedBy` 和完成后解锁逻辑
4. 最后再加 owner、并行调度、后台执行

这样你会更容易看清每一层到底在解决什么问题。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Create tasks for setup -> build -> test with sequential dependencies`
2. `Create tasks for parse -> transform -> emit -> test, where transform and emit depend on parse`
3. `Complete one task and verify that dependent tasks become unblocked`
4. `List all tasks and explain which ones are ready right now`

练习时重点观察一件事：

`如果没有依赖图，Agent 是否更容易乱排顺序；有了任务图后，是否更容易稳定推进`

## 结论

`s07` 想让你建立的核心意识是：

当任务开始变长、变多、变复杂、需要跨会话甚至跨 Agent 协作时，平面待办已经不够了。  
你需要的是一个能表达依赖关系、能持久化、能持续回答“下一步做什么”的任务图系统。

换成一句最容易记的话就是：

`Persist the plan, encode the dependencies, let the graph drive execution.`
