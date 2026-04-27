# s11 自主 Agent

本文基于 Learn Claude Code 的 `s11` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么团队不能永远靠领导逐个分配任务，以及自组织 Agent 为什么需要“看板扫描 + 认领 + 空闲治理”。

参考原文：[Learn Claude Code - s11 自主 Agent](https://learn.shareai.run/zh/s11/)

## 一句话理解

`s11` 的核心是：

`队友自己看任务板、自己认领任务、自己决定何时继续工作`

也可以记成：

`从领导派活，升级到队友自组织接活`

## 为什么需要自主 Agent

到了 `s09` 和 `s10`，你已经拥有了：

- 持久化队友
- 文件邮箱
- 团队协议
- 请求-响应协商机制

这已经能支持一个“有组织”的团队，但还有一个明显瓶颈：

`领导仍然是任务分发中心`

这意味着：

- 每个队友都要等领导指派
- 任务板上有很多任务时，领导会成为瓶颈
- 扩展到更多队友时，协调成本急剧上升

所以 `s11` 的核心变化是：

`让队友自己去看任务板，发现可以做的任务，然后主动认领`

## `s11` 真正解决的核心问题

这一章本质上在解决：

`如何让 Agent 团队从被动执行，升级为自组织执行`

重点不是“每个人都随便乱做”，而是：

- 有清晰的空闲态
- 有周期性轮询
- 有明确的认领规则
- 有超时退出机制

## 自主 Agent 的关键循环

这一章最重要的心智模型其实不是工具，而是一个循环：

`work -> idle -> poll -> claim -> work`

也就是说，一个自主队友不是永远忙，也不是永远睡着，而是在两个阶段之间切换：

- `WORK`
- `IDLE`

## WORK 阶段在做什么

这一阶段和普通 Agent 很像：

- 处理消息
- 调用工具
- 推进任务

直到：

- 没有更多工具可用
- 当前工作做完了
- 或者主动进入空闲

这时它就进入 `IDLE`。

## IDLE 阶段在做什么

当队友空闲时，它不会直接退出，而是进入一个轮询期：

1. 定期检查收件箱
2. 定期扫描任务板
3. 如果发现新消息或可认领任务，就恢复工作
4. 如果一段时间都没有事做，就优雅关闭

## 为什么需要 IDLE，而不是直接退出

因为在协作系统里，队友的价值不仅是执行当前任务，还包括：

- 持续作为团队成员存在
- 等待下一份工作
- 接收新指令

所以 IDLE 其实是“待命态”。

## 任务认领为什么重要

只有“看见任务”还不够，系统还需要防止多个 Agent 同时抢同一个任务。

所以自主执行的核心不是扫描，而是：

`scan + claim`

也就是说：

1. 找出可做任务
2. 抢占一个任务 owner
3. 把该任务绑定给自己
4. 再开始做

## 什么样的任务可以被自动认领

原始思路通常是：

- `status === "pending"`
- 没有 `owner`
- 没有 `blockedBy`

## 一个最小任务扫描条件

```ts
function isClaimable(task: Task) {
  return (
    task.status === "pending" &&
    !task.owner &&
    task.blockedBy.length === 0
  );
}
```

## 为什么 `claim` 要显式化

因为如果只是看见了任务，没有明确把 `owner` 写上去，就会出现竞争问题：

- alice 看见任务 1 可做
- bob 也看见任务 1 可做
- 两人同时开工

所以认领动作必须把任务状态更新到共享任务板里，例如：

- `owner = "alice"`
- `status = "in_progress"`

## TypeScript 里怎么理解自主循环

```ts
while (true) {
  await workPhase();
  const shouldResume = await idlePhase();

  if (!shouldResume) {
    break;
  }
}
```

## 一个简化版 `idlePhase()`

```ts
async function idlePhase(name: string): Promise<boolean> {
  const pollIntervalMs = 5000;
  const timeoutMs = 60000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await Bun.sleep(pollIntervalMs);

    const inbox = await bus.readInbox(name);
    if (inbox.length > 0) {
      return true;
    }

    const unclaimed = await scanUnclaimedTasks();
    if (unclaimed.length > 0) {
      await claimTask(unclaimed[0].id, name);
      return true;
    }
  }

  return false;
}
```

## 为什么先查 inbox 再查 task board

因为直接发给队友的消息通常优先级更高，比如：

- 领导的直接请求
- 队友的协作消息
- 某个审批结果

所以常见顺序是：

1. 先收件箱
2. 再任务板

## 为什么要有超时自动关机

如果没有超时机制，空闲队友可能会：

- 一直活着
- 一直轮询
- 持续耗资源

所以 `s11` 设计了：

`IDLE 一段时间后自动 shutdown`

## 身份重注入为什么是这章重点之一

一旦用了 `s06` 的上下文压缩，Agent 可能会忘记：

- 自己是谁
- 自己的角色是什么
- 自己属于哪个团队

所以 `s11` 会在上下文过短时重新注入身份块。

## 一个简化版身份重注入

```ts
function reinjectIdentityIfNeeded(
  messages: Array<{ role: string; content: unknown }>,
  name: string,
  role: string,
  teamName: string,
) {
  if (messages.length > 3) return;

  messages.unshift({
    role: "assistant",
    content: `I am ${name}. Continuing as ${role}.`,
  });

  messages.unshift({
    role: "user",
    content: `<identity>You are "${name}", role: ${role}, team: ${teamName}. Continue your work.</identity>`,
  });
}
```

## 和 `s07`、`s10` 的关系

- `s07` 提供可扫描的任务图
- `s10` 提供协议和审批边界
- `s11` 让队友自己消费任务图并受协议约束

## 一个接近完整的最小结构

```ts
async function teammateMainLoop(name: string, role: string, prompt: string) {
  const messages = [{ role: "user", content: prompt }];

  while (true) {
    await workPhase(messages, name, role);

    const shouldResume = await idlePhase(name, messages);
    if (!shouldResume) {
      await setTeammateStatus(name, "shutdown");
      return;
    }

    await setTeammateStatus(name, "working");
    reinjectIdentityIfNeeded(messages, name, role, "default-team");
  }
}

async function scanUnclaimedTasks() {
  const tasks = await taskManager.listAll();
  return tasks.filter(
    (task) =>
      task.status === "pending" &&
      !task.owner &&
      task.blockedBy.length === 0,
  );
}

async function claimTask(taskId: number, owner: string) {
  const task = await taskManager.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task.owner = owner;
  task.status = "in_progress";
  await taskManager.save(task);
}
```

## 这一章最值得学的工程观念

- 团队扩展性不能依赖一个领导手工派活
- 自治需要共享任务板作为协调面
- 自主认领必须有明确规则和 owner 机制
- 空闲成员需要有待命期，也需要有退出机制
- 压缩后的身份连续性必须被主动恢复

## 结论

`s11` 想让你建立的核心意识是：

真正可扩展的多 Agent 团队，不应该靠领导把每件事逐个塞给每个人。它应该让成员自己观察共享任务板、主动认领、按规则推进，并在空闲时保持待命或自行退出。

换成一句最容易记的话就是：

`A scalable team does not wait to be told every next step. It scans, claims, and keeps moving.`
# s11 自主 Agent

本文基于 Learn Claude Code 的 `s11` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么团队不能永远靠领导逐个分配任务，以及自组织 Agent 为什么需要“看板扫描 + 认领 + 空闲治理”。

参考原文：[Learn Claude Code - s11 自主 Agent](https://learn.shareai.run/zh/s11/)

## 一句话理解

`s11` 的核心是：

`队友自己看任务板、自己认领任务、自己决定何时继续工作`

也可以记成：

`从领导派活，升级到队友自组织接活`

## 为什么需要自主 Agent

到了 `s09` 和 `s10`，你已经拥有了：

- 持久化队友
- 文件邮箱
- 团队协议
- 请求-响应协商机制

这已经能支持一个“有组织”的团队。  
但还有一个明显瓶颈：

`领导仍然是任务分发中心`

这意味着：

- 每个队友都要等领导指派
- 任务板上有很多任务时，领导会成为瓶颈
- 扩展到更多队友时，协调成本急剧上升

所以 `s11` 的核心变化是：

`让队友自己去看任务板，发现可以做的任务，然后主动认领`

## `s11` 真正解决的核心问题

这一章本质上在解决：

`如何让 Agent 团队从被动执行，升级为自组织执行`

重点不是“每个人都随便乱做”，而是：

- 有清晰的空闲态
- 有周期性轮询
- 有明确的认领规则
- 有超时退出机制

也就是说，它不是无政府状态，而是“受约束的自治”。

## 从 `s10` 到 `s11` 的本质变化

你可以把这两章这样对比：

### `s10`

强调：

- 协议
- 审批
- 协商

### `s11`

强调：

- 主动扫描任务板
- 自己认领未分配任务
- 在 idle 和 work 之间切换

如果说 `s10` 让团队有“制度”，那 `s11` 则让团队开始“自驱”。

## 自主 Agent 的关键循环

这一章最重要的心智模型其实不是工具，而是一个循环：

`work -> idle -> poll -> claim -> work`

也就是说，一个自主队友不是永远忙，也不是永远睡着，而是在两个阶段之间切换：

- `WORK`
- `IDLE`

## WORK 阶段在做什么

这一阶段和普通 Agent 很像：

- 处理消息
- 调用工具
- 推进任务

直到：

- 没有更多工具可用
- 当前工作做完了
- 或者主动进入空闲

这时它就进入 `IDLE`。

## IDLE 阶段在做什么

这才是 `s11` 的关键。

当队友空闲时，它不会直接退出，而是进入一个轮询期：

1. 定期检查收件箱
2. 定期扫描任务板
3. 如果发现新消息或可认领任务，就恢复工作
4. 如果一段时间都没有事做，就优雅关闭

这个设计非常关键，因为它让队友既不会一直空转，也不会过早消失。

## 为什么需要 IDLE，而不是直接退出

因为在协作系统里，队友的价值不仅是执行当前任务，还包括：

- 持续作为团队成员存在
- 等待下一份工作
- 接收新指令

如果每次做完一点工作就直接退出，那团队就会退回到：

- 频繁创建
- 频繁销毁
- 角色记忆和团队结构不稳定

所以 IDLE 其实是“待命态”。

## 任务认领为什么重要

因为只有“看见任务”还不够，系统还需要防止多个 Agent 同时抢同一个任务。

所以自主执行的核心不是扫描，而是：

`scan + claim`

也就是说：

1. 找出可做任务
2. 抢占一个任务 owner
3. 把该任务绑定给自己
4. 再开始做

这样团队才不会互相踩。

## 什么样的任务可以被自动认领

原始思路通常是：

- `status === "pending"`
- 没有 `owner`
- 没有 `blockedBy`

也就是：

- 任务尚未开始
- 没有人在做
- 没有前置阻塞

这种任务才是“ready and unclaimed”。

## 一个最小任务扫描条件

```ts
function isClaimable(task: Task) {
  return (
    task.status === "pending" &&
    !task.owner &&
    task.blockedBy.length === 0
  );
}
```

这段小逻辑其实非常关键，因为它定义了团队自组织的边界。

## 为什么 `claim` 要显式化

因为如果只是看见了任务，没有明确把 `owner` 写上去，就会出现竞争问题：

- alice 看见任务 1 可做
- bob 也看见任务 1 可做
- 两人同时开工

所以认领动作必须把任务状态更新到共享任务板里，例如：

- `owner = "alice"`
- `status = "in_progress"`

这一步是并发协作的关键。

## TypeScript 里怎么理解自主循环

你可以先把它拆成两段：

```ts
while (true) {
  await workPhase();
  const shouldResume = await idlePhase();

  if (!shouldResume) {
    break;
  }
}
```

这段代码很简单，但它已经抓住了 `s11` 的核心：

- 工作不是一次性结束
- 空闲不是永久终止
- 队友会在待命和执行之间循环切换

## 一个简化版 `idlePhase()`

```ts
async function idlePhase(name: string): Promise<boolean> {
  const pollIntervalMs = 5000;
  const timeoutMs = 60000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await Bun.sleep(pollIntervalMs);

    const inbox = await bus.readInbox(name);
    if (inbox.length > 0) {
      return true;
    }

    const unclaimed = await scanUnclaimedTasks();
    if (unclaimed.length > 0) {
      await claimTask(unclaimed[0].id, name);
      return true;
    }
  }

  return false;
}
```

这段代码体现了 `s11` 的关键治理逻辑：

- 周期性轮询
- 收件箱优先
- 看板次之
- 超时退出

## 为什么先查 inbox 再查 task board

因为直接发给队友的消息通常优先级更高。

比如：

- 领导的直接请求
- 队友的协作消息
- 某个审批结果

如果 Agent 先无脑去扫任务板，可能会忽略本该优先处理的团队消息。

所以常见顺序是：

1. 先收件箱
2. 再任务板

这能让自治不至于变成“只看任务，不看沟通”。

## 为什么要有超时自动关机

如果没有超时机制，空闲队友可能会：

- 一直活着
- 一直轮询
- 持续耗资源

这在实际系统里会造成：

- 资源浪费
- 状态膨胀
- 队伍越来越大却没人真正干活

所以 `s11` 设计了：

`IDLE 一段时间后自动 shutdown`

这是自治系统很重要的“自我收缩能力”。

## 身份重注入为什么是这章重点之一

这是一个非常实战的问题。

因为一旦用了 `s06` 的上下文压缩，Agent 可能会忘记：

- 自己是谁
- 自己的角色是什么
- 自己属于哪个团队

而对自主 Agent 来说，身份非常重要。  
因为它决定：

- 能认领什么任务
- 应该用什么角色视角工作
- 收到消息时如何理解自己位置

所以 `s11` 会在上下文过短时重新注入身份块。

## 一个简化版身份重注入

```ts
function reinjectIdentityIfNeeded(
  messages: Array<{ role: string; content: unknown }>,
  name: string,
  role: string,
  teamName: string,
) {
  if (messages.length > 3) return;

  messages.unshift({
    role: "assistant",
    content: `I am ${name}. Continuing as ${role}.`,
  });

  messages.unshift({
    role: "user",
    content: `<identity>You are "${name}", role: ${role}, team: ${teamName}. Continue your work.</identity>`,
  });
}
```

这一步的重点是：

`压缩后要恢复角色连续性`

不然自治 Agent 很容易“失忆”。

## 为什么 `s11` 是协作系统的关键升级

因为从这一章开始，团队不再是：

- 领导指一下，队友动一下

而开始变成：

- 队友自己去找活
- 自己判断是否能做
- 自己认领并推进

这会极大提升系统扩展性。

否则领导永远会成为单点瓶颈。

## 和 `s07 任务系统` 的关系

`s11` 本质上是建立在 `s07` 之上的。

因为没有共享任务板，就没有自治认领。

也就是说：

- `s07` 提供可扫描的任务图
- `s11` 让队友自己消费这个任务图

所以这两章是强绑定关系。

## 和 `s10 团队协议` 的关系

自治并不意味着没有纪律。  
相反，越自治越需要制度边界。

所以：

- 自主队友可以自己认领任务
- 但某些高风险动作仍然走 `s10` 的审批协议

这说明一个成熟系统不是“自由或规则二选一”，而是：

- 低风险事情自动推进
- 高风险事情协议把关

## 一个接近完整的最小结构

```ts
async function teammateMainLoop(name: string, role: string, prompt: string) {
  const messages = [{ role: "user", content: prompt }];

  while (true) {
    await workPhase(messages, name, role);

    const shouldResume = await idlePhase(name, messages);
    if (!shouldResume) {
      await setTeammateStatus(name, "shutdown");
      return;
    }

    await setTeammateStatus(name, "working");
    reinjectIdentityIfNeeded(messages, name, role, "default-team");
  }
}

async function scanUnclaimedTasks() {
  const tasks = await taskManager.listAll();
  return tasks.filter(
    (task) =>
      task.status === "pending" &&
      !task.owner &&
      task.blockedBy.length === 0,
  );
}

async function claimTask(taskId: number, owner: string) {
  const task = await taskManager.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task.owner = owner;
  task.status = "in_progress";
  await taskManager.save(task);
}
```

这段结构已经足够体现 `s11` 的骨架。

## 这一章最值得学的工程观念

`s11` 最重要的不是“会不会轮询”，而是这几个工程心法：

- 团队扩展性不能依赖一个领导手工派活
- 自治需要共享任务板作为协调面
- 自主认领必须有明确规则和 owner 机制
- 空闲成员需要有待命期，也需要有退出机制
- 压缩后的身份连续性必须被主动恢复

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 5 步来：

1. 先把 `work` / `idle` 两阶段拆出来
2. 再实现 `scanUnclaimedTasks()`
3. 然后实现 `claimTask()`
4. 接着加 inbox 优先轮询
5. 最后再补身份重注入和 idle timeout

这样你会更容易看到自治机制是如何逐层长出来的。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Create several unclaimed tasks and let teammates auto-claim them`
2. `Spawn two teammates and observe how ownership prevents collisions`
3. `Create blocked tasks and verify teammates skip them until unblocked`
4. `Trigger compaction and verify identity gets reinjected correctly`

练习时重点观察一件事：

`如果没有自治机制，领导是否会成为瓶颈；有了看板扫描和认领后，团队是否更像自驱系统`

## 结论

`s11` 想让你建立的核心意识是：

真正可扩展的多 Agent 团队，不应该靠领导把每件事逐个塞给每个人。  
它应该让成员自己观察共享任务板、主动认领、按规则推进，并在空闲时保持待命或自行退出。

换成一句最容易记的话就是：

`A scalable team does not wait to be told every next step. It scans, claims, and keeps moving.`
