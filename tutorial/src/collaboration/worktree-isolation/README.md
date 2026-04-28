# s12 Worktree + 任务隔离

本文基于 Learn Claude Code 的 `s12` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么共享工作目录会让多 Agent 协作互相污染，以及任务系统和 worktree 系统为什么需要被绑定在一起。

参考原文：[Learn Claude Code - s12 Worktree + 任务隔离](https://learn.shareai.run/zh/s12/)

## 一句话理解

`s12` 的核心是：

`任务板负责“做什么”，worktree 负责“在哪做”`

也可以记成：

`任务隔离目标，worktree 隔离目录`

这句话就是这一章的总纲。

## 为什么需要 Worktree + 任务隔离

到了 `s11`，团队已经很强了：

- 队友有身份
- 有邮箱和协议
- 会自己扫描任务板
- 会自己认领任务

但还有一个非常现实的问题没有解决：

`大家仍然在同一个工作目录里改东西`

这会带来很多风险：

- 不同任务改动互相污染
- 未提交修改互相干扰
- 回滚和清理困难
- 两个 Agent 改同一文件时容易冲突

也就是说：

- 任务板解决了“谁做什么”
- 但没有解决“大家在哪做”

这正是 `s12` 要补上的最后一块拼图。

## `s12` 真正解决的核心问题

这一章本质上在解决：

`多 Agent 协作时，如何同时隔离任务目标和物理工作目录`

所以这里其实有两个平面：

1. `control plane`
   任务板，记录目标和状态
2. `execution plane`
   worktree 目录，承载实际代码修改

这两个平面通过 `task_id` 绑定起来。

## 为什么任务系统本身不够

即使你已经有了 `s07` 的任务板，也还是不够，因为任务板只会回答：

- 这件事是谁做
- 现在是什么状态
- 前后依赖是什么

它不会回答：

- 代码在哪个目录里改
- 这次修改和别的任务物理上怎么隔离

所以任务板只能管理“目标状态”，不能管理“执行空间”。

这就是为什么需要 worktree。

## 为什么 worktree 很适合这个问题

因为 git worktree 天然提供：

- 同一仓库多个工作目录
- 每个目录可以对应独立分支
- 不同任务改动物理隔离

这正好对应多 Agent 协作的需求：

- 一个任务一个目录
- 一个目录一组未提交改动
- 不同 Agent 互不干扰

所以 `s12` 不是随便加个目录管理器，而是把任务系统和 git worktree 绑定起来。

## 这章最重要的心智模型

请记住这一组关系：

- 任务管理“意图”
- worktree 管理“现场”
- `task_id` 是两者绑定键

换句话说：

- `.tasks/` 里记录任务状态
- `.worktrees/` 里记录目录状态
- 两边靠 ID 同步

这才是 `s12` 的骨架。

## 两套状态机

这一章还有一个很重要的设计：  
从这里开始，你不只管理任务状态，还要管理 worktree 状态。

### 任务状态机

通常是：

`pending -> in_progress -> completed`

### worktree 状态机

通常是：

`absent -> active -> removed | kept`

你可以把它理解成：

- 任务表示“目标推进到哪”
- worktree 表示“执行目录处于什么阶段”

这两个状态机相互关联，但不完全等同。

## 为什么需要 `.worktrees/index.json`

因为当 worktree 多起来时，系统需要一个集中索引来回答：

- 当前有哪些 worktree
- 每个 worktree 对应哪个任务
- 路径和分支分别是什么
- 状态是 active、removed 还是 kept

所以通常会有：

```txt
.worktrees/index.json
```

这个索引就像任务板之于任务一样，是 worktree 世界的控制面。

## 为什么还需要 `events.jsonl`

因为仅有当前状态还不够。  
在复杂协作系统里，你还会关心生命周期事件，比如：

- 什么时候创建了 worktree
- 创建成功还是失败
- 什么时候删除
- 删除时是否顺带完成任务

所以还会有：

```txt
.worktrees/events.jsonl
```

它记录的是：

- 事件流
- 时序
- 失败与成功历史

这对恢复、排查、审计都很有价值。

## 一个最小的 worktree 记录结构

```ts
type WorktreeStatus = "active" | "removed" | "kept";

type WorktreeRecord = {
  name: string;
  path: string;
  branch: string;
  taskId: number | null;
  status: WorktreeStatus;
};
```

它最关键的字段是：

- `name`
- `path`
- `branch`
- `taskId`
- `status`

其中 `taskId` 是这章的灵魂字段。

## 任务和 worktree 是怎么绑定的

这一步非常重要。

通常流程是：

1. 先创建任务
2. 再创建 worktree
3. 创建 worktree 时传入 `taskId`
4. 系统把两边状态同时更新

例如：

- 任务写入 `worktree: "auth-refactor"`
- worktree 写入 `taskId: 1`

这样控制面和执行面就绑在一起了。

## 为什么绑定时要顺带推进任务状态

因为当一个任务已经被绑定到执行目录时，它通常已经不应该继续保持 `pending`。

更合理的语义是：

- 一旦真正分配了 worktree 并开始进入执行空间
- 任务就推进到 `in_progress`

这样系统状态才一致。

所以绑定不仅是“记个名字”，而是一次跨两个系统的状态联动。

## TypeScript 里怎么理解 `bindWorktree()`

```ts
async function bindWorktree(taskId: number, worktreeName: string) {
  const task = await taskManager.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  task.worktree = worktreeName;

  if (task.status === "pending") {
    task.status = "in_progress";
  }

  await taskManager.save(task);
}
```

这段代码最关键的不是保存字段，而是：

`绑定 worktree 同时改变任务状态语义`

## 创建 worktree 为什么是“执行平面启动”

因为从这一刻开始，任务不再只是纸面计划，而有了一个真实工作目录：

- 有独立路径
- 有独立分支
- 有独立改动

这就是执行空间的诞生。

在 TypeScript 里，你可以把创建动作理解成：

```ts
async function createWorktree(name: string, taskId?: number) {
  const branch = `wt/${name}`;
  const path = `.worktrees/${name}`;

  // git worktree add -b wt/name path HEAD

  const record: WorktreeRecord = {
    name,
    path,
    branch,
    taskId: taskId ?? null,
    status: "active",
  };

  await worktreeIndex.save(record);

  if (taskId != null) {
    await bindWorktree(taskId, name);
  }

  return record;
}
```

这就是控制面和执行面接上的那一刻。

## 为什么后续命令要在 worktree 目录里执行

因为 worktree 的价值就在于“目录隔离”。

如果你创建了 worktree，但命令还是在主目录里跑，那就失去意义了。

所以从 `s12` 开始，很多命令会变成：

- 指定 `cwd = worktree.path`

这意味着：

- 每个任务在自己的执行目录工作
- 文件改动不会互相污染
- 每个任务都有独立现场

这对多 Agent 协作极其重要。

## keep 和 remove 为什么要分开

收尾时不是所有 worktree 都应该一刀切地删掉。

有两种常见场景：

### `keep`

表示：

- 暂时保留目录
- 后续还可能继续工作
- 或者要留给人检查

### `remove`

表示：

- 彻底拆除目录
- 清理执行现场
- 必要时顺便完成绑定任务

这两个动作语义不同，所以需要显式区分。

## 为什么 `remove` 可以顺带完成任务

因为在很多场景下：

- 任务已经做完
- 对应 worktree 也不再需要

所以把这两件事合成一个动作非常自然：

- 删除执行目录
- 完成任务状态
- 解除绑定

这会让系统收尾非常干净。

## 一个简化版 `removeWorktree()`

```ts
async function removeWorktree(
  name: string,
  options: { completeTask?: boolean } = {},
) {
  const worktree = await worktreeIndex.get(name);
  if (!worktree) {
    throw new Error(`Unknown worktree: ${name}`);
  }

  // git worktree remove worktree.path

  worktree.status = "removed";
  await worktreeIndex.save(worktree);

  if (options.completeTask && worktree.taskId != null) {
    const task = await taskManager.get(worktree.taskId);
    if (task) {
      task.status = "completed";
      task.worktree = "";
      await taskManager.save(task);
    }
  }
}
```

这段代码体现的是：

- 拆执行空间
- 同步控制面状态

## 事件流为什么重要

一旦系统变得复杂，你就不能只看当前状态了。  
你还会关心：

- 发生过什么
- 顺序是什么
- 哪一步失败了

所以 `events.jsonl` 记录的不是“现在是什么”，而是“刚才发生了什么”。

例如事件可能包括：

- `worktree.create.before`
- `worktree.create.after`
- `worktree.create.failed`
- `worktree.remove.before`
- `worktree.remove.after`
- `task.completed`

这能极大提升系统可观测性。

## 为什么 `s12` 是整个系列的最后一块拼图

因为前面几章已经逐步搭好了这些能力：

- `s07` 有任务板
- `s08` 有后台执行
- `s09` 有持久化队友
- `s10` 有协议
- `s11` 有自组织认领

但直到 `s12`，大家仍可能在同一个目录里互相踩踏。

所以 `s12` 真正补齐的是：

`协作系统的物理隔离层`

从这时起，系统才真正具备：

- 目标协调
- 身份协作
- 协议治理
- 自主分工
- 执行隔离

## 和 `s07 任务系统` 的关系

这两章是直接绑定的。

- `s07` 解决“任务怎么被结构化管理”
- `s12` 解决“任务在哪个隔离目录里执行”

也就是说：

- 任务板是控制面
- worktree 是执行面

没有任务板，worktree 不知道服务哪个目标。  
没有 worktree，任务板 又缺乏物理隔离能力。

## 和 `s11 自主 Agent` 的关系

到了自治阶段，队友自己会认领任务。  
如果没有 worktree，自治越强，互相污染风险越高。

所以 `s12` 对 `s11` 的补充可以概括成一句话：

`不仅要知道谁做什么，还要知道谁在哪做`

这就是协作系统从“组织隔离”走向“目录隔离”。

## 一个接近完整的最小结构

```ts
type WorktreeStatus = "active" | "removed" | "kept";

type WorktreeRecord = {
  name: string;
  path: string;
  branch: string;
  taskId: number | null;
  status: WorktreeStatus;
};

async function createWorktree(name: string, taskId?: number) {
  const record: WorktreeRecord = {
    name,
    path: `.worktrees/${name}`,
    branch: `wt/${name}`,
    taskId: taskId ?? null,
    status: "active",
  };

  await worktreeIndex.save(record);

  if (taskId != null) {
    const task = await taskManager.get(taskId);
    if (task) {
      task.worktree = name;
      if (task.status === "pending") {
        task.status = "in_progress";
      }
      await taskManager.save(task);
    }
  }

  return record;
}

async function keepWorktree(name: string) {
  const worktree = await worktreeIndex.get(name);
  if (!worktree) throw new Error(`Unknown worktree: ${name}`);

  worktree.status = "kept";
  await worktreeIndex.save(worktree);
}

async function removeWorktree(name: string, completeTask = false) {
  const worktree = await worktreeIndex.get(name);
  if (!worktree) throw new Error(`Unknown worktree: ${name}`);

  worktree.status = "removed";
  await worktreeIndex.save(worktree);

  if (completeTask && worktree.taskId != null) {
    const task = await taskManager.get(worktree.taskId);
    if (task) {
      task.status = "completed";
      task.worktree = "";
      await taskManager.save(task);
    }
  }
}
```

这段结构已经足够体现 `s12` 的核心骨架。

## 这一章最值得学的工程观念

`s12` 最重要的不是“会不会调 git worktree”，而是这几个工程心法：

- 复杂协作不仅要隔离任务，还要隔离执行目录
- 控制面和执行面要分开设计
- 任务和目录必须通过 ID 绑定
- 生命周期要覆盖创建、保留、删除和完成
- 当前状态之外，还需要事件流记录过程

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 5 步来：

1. 先实现 `.worktrees/index.json`
2. 再实现 `createWorktree(name, taskId)`
3. 然后在任务里增加 `worktree` 字段
4. 接着让命令支持指定 worktree `cwd`
5. 最后再补 `keep/remove` 和 `events.jsonl`

这样你会更容易理解“任务隔离”和“目录隔离”是两层不同能力。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Create two tasks and bind each one to a different worktree`
2. `Run commands inside a specific worktree and compare outputs`
3. `Keep one worktree and remove another with completeTask=true`
4. `Inspect index and event logs after several lifecycle operations`

练习时重点观察一件事：

`如果没有目录隔离，多个自治 Agent 是否很容易互相污染；有了 task + worktree 绑定后，协作是否更可控`

## 结论

`s12` 想让你建立的核心意识是：

一个真正成熟的多 Agent 协作系统，不能只知道谁在做什么，还必须知道每项工作在哪个独立执行空间里发生。  
任务系统管理目标，worktree 系统管理现场，两者通过 ID 绑定，协作才能既高效又干净。

换成一句最容易记的话就是：

`Tasks tell the team what to do. Worktrees give each task a place to do it safely.`
