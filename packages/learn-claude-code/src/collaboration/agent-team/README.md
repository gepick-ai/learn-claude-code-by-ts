# s09 Agent 团队

本文基于 Learn Claude Code 的 `s09` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么一次性子 Agent 已经不够了，以及“持久化队友 + 文件邮箱”是如何把系统推进到真正团队协作阶段的。

参考原文：[Learn Claude Code - s09 Agent 团队](https://learn.shareai.run/zh/s09/)

## 一句话理解

`s09` 的核心是：

`当一个 Agent 干不完时，就需要能长期存活的队友，而不是一次性子任务`

也可以记成：

`subagent 是临时工，teammate 是常驻队友`

## 为什么需要 Agent 团队

到了 `s04`，你已经有了子 Agent，它适合一次性子任务、独立探索和返回摘要后退出。

但它仍然没有：

- 稳定身份
- 跨多轮存活能力
- 持续角色记忆
- 真正通信通道

而 `s08` 的后台任务解决的是慢 I/O 执行，不是多个 LLM 驱动成员的长期协作。

所以 `s09` 引入的是一个新层次：

`persistent teammates`

## `s09` 真正解决的核心问题

这一章本质上在解决 3 件事：

1. 智能体要有持久身份
2. 智能体要有生命周期
3. 智能体之间要能通信

如果没有这三点，你只能有一次性委派，还不能真正拥有“团队”。

## 子 Agent 和队友的区别

### 子 Agent

- 一次性创建
- 完成任务后返回摘要
- 立刻消亡
- 没有持续身份

### 队友 Agent

- 有固定名字和角色
- 能持续运行多轮
- 能从 `working` 进入 `idle`
- 能收发消息
- 能在后续再次被唤醒

你可以把它理解成：

- 子 Agent 更像函数调用
- 队友 Agent 更像长期在线的协作者

## 这一章最重要的新增概念

`team roster + mailbox + lifecycle`

也就是：

- 团队名册
- 文件邮箱
- 生命周期管理

## 团队名册是什么

名册的作用是记录：

- 有哪些成员
- 每个人的角色
- 当前状态如何

最常见的持久化方式就是：

```txt
.team/config.json
```

比如：

```json
{
  "members": [
    { "name": "lead", "role": "leader", "status": "working" },
    { "name": "alice", "role": "coder", "status": "idle" },
    { "name": "bob", "role": "tester", "status": "working" }
  ]
}
```

## 文件邮箱是什么

做法通常是：

```txt
.team/inbox/
  alice.jsonl
  bob.jsonl
  lead.jsonl
```

每个人一个收件箱文件。

发送消息时：

- 往目标成员的 `.jsonl` 追加一行 JSON

读取消息时：

- 把整份文件读出来
- 然后清空，实现 drain-on-read

## 为什么邮箱用 JSONL

因为它天然适合追加写入：

- append-only 很简单
- 崩溃恢复友好
- 容易排查和调试
- 不需要复杂数据库也能工作

## 一个最小消息结构

```ts
type TeamMessage = {
  type: string;
  from: string;
  content: string;
  timestamp: number;
};
```

## MessageBus 在 TypeScript 里怎么理解

它就是一个文件版消息队列，主要做两件事：

1. `send()`
2. `readInbox()`

### `send()`

```ts
class MessageBus {
  constructor(private inboxDir: string) {}

  async send(from: string, to: string, content: string, type = "message") {
    const line = JSON.stringify({
      type,
      from,
      content,
      timestamp: Date.now(),
    });

    const file = Bun.file(`${this.inboxDir}/${to}.jsonl`);
    const current = (await file.exists()) ? await file.text() : "";
    await Bun.write(`${this.inboxDir}/${to}.jsonl`, current + line + "\n");
  }
}
```

### `readInbox()`

```ts
class MessageBus {
  async readInbox(name: string) {
    const path = `${this.inboxDir}/${name}.jsonl`;
    const file = Bun.file(path);

    if (!(await file.exists())) {
      return [];
    }

    const text = await file.text();
    await Bun.write(path, "");

    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}
```

这里最重要的点是：

`readInbox()` 不是只读不删，而是读完清空

## 队友循环和普通 Agent 循环有什么不同

队友循环在每轮调用模型前，要先做一件事：

`检查收件箱`

也就是说，消息流除了用户和工具，还多了“队友消息注入”。

## 一个简化版队友循环

```ts
async function teammateLoop(name: string, role: string, prompt: string) {
  const messages = [{ role: "user", content: prompt }];

  for (let i = 0; i < 50; i++) {
    const inbox = await bus.readInbox(name);

    if (inbox.length > 0) {
      messages.push({
        role: "user",
        content: `<inbox>${JSON.stringify(inbox)}</inbox>`,
      });

      messages.push({
        role: "assistant",
        content: "Noted inbox messages.",
      });
    }

    const response = await callModel({ messages });
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      break;
    }

    // ...执行工具...
  }
}
```

## TeammateManager 是什么

你可以把它理解成团队控制器，负责：

- 维护团队名册
- 启动队友
- 更新状态
- 记录线程或运行实例

一个最小版结构可以是：

```ts
type Teammate = {
  name: string;
  role: string;
  status: "working" | "idle" | "shutdown";
};

class TeammateManager {
  private members: Teammate[] = [];

  async spawn(name: string, role: string, prompt: string) {
    this.members.push({ name, role, status: "working" });
    void teammateLoop(name, role, prompt);
    return `Spawned teammate "${name}" (${role})`;
  }
}
```

## 和 `s04`、`s08` 的关系

- `s04`：一次性子任务隔离
- `s08`：后台跑慢命令
- `s09`：长期存在、可通信的队友体系

所以：

- 后台任务是 I/O 执行并发
- Agent 团队是认知协作并发

## 一个接近完整的最小结构

```ts
type TeammateStatus = "working" | "idle" | "shutdown";

type Teammate = {
  name: string;
  role: string;
  status: TeammateStatus;
};

type TeamMessage = {
  type: string;
  from: string;
  content: string;
  timestamp: number;
};

class MessageBus {
  constructor(private inboxDir: string) {}

  async send(from: string, to: string, content: string, type = "message") {
    const filePath = `${this.inboxDir}/${to}.jsonl`;
    const file = Bun.file(filePath);
    const current = (await file.exists()) ? await file.text() : "";

    const line = JSON.stringify({
      type,
      from,
      content,
      timestamp: Date.now(),
    } satisfies TeamMessage);

    await Bun.write(filePath, current + line + "\n");
  }

  async readInbox(name: string): Promise<TeamMessage[]> {
    const filePath = `${this.inboxDir}/${name}.jsonl`;
    const file = Bun.file(filePath);

    if (!(await file.exists())) return [];

    const text = await file.text();
    await Bun.write(filePath, "");

    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TeamMessage);
  }
}
```

## 这一章最值得学的工程观念

- 协作成员必须有身份
- 持续协作必须有生命周期
- 多 Agent 通信必须有稳定通道
- 状态要持久化，不要只存在于 prompt 里
- 一次性子任务和长期队友是两种不同组织形态

## 结论

`s09` 想让你建立的核心意识是：

当系统开始进入多人协作阶段时，光有子任务已经不够了。你需要的是有名字、有角色、有状态、能互相通信、能跨多轮持续存在的队友体系。

换成一句最容易记的话就是：

`A team is not many prompts. A team is identity, lifecycle, and communication.`
# s09 Agent 团队

本文基于 Learn Claude Code 的 `s09` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么一次性子 Agent 已经不够了，以及“持久化队友 + 文件邮箱”是如何把系统推进到真正团队协作阶段的。

参考原文：[Learn Claude Code - s09 Agent 团队](https://learn.shareai.run/zh/s09/)

## 一句话理解

`s09` 的核心是：

`当一个 Agent 干不完时，就需要能长期存活的队友，而不是一次性子任务`

也可以记成：

`subagent 是临时工，teammate 是常驻队友`

## 为什么需要 Agent 团队

到了 `s04`，你已经有了子 Agent。  
它很适合：

- 拆一次性的子任务
- 在独立上下文里做探索
- 返回摘要后退出

但它仍然有明显限制：

- 没有稳定身份
- 不能跨多轮持续存在
- 不能长期保留自己的角色定位
- 没有真正的通信通道

而 `s08` 的后台任务虽然能并发跑命令，但它解决的是：

- 慢 I/O 执行

它不解决：

- 多个 LLM 驱动的执行者协作
- 长期存在的成员生命周期
- 成员之间的结构化沟通

所以 `s09` 引入的是一个新层次：

`persistent teammates`

## `s09` 真正解决的核心问题

这一章本质上在解决 3 件事：

1. 智能体要有持久身份
2. 智能体要有生命周期
3. 智能体之间要能通信

如果没有这三点，你只能有：

- 一次性委派
- 或单个 Agent 自己做所有事

但你还不能真正拥有“团队”。

## 子 Agent 和队友的区别

这是 `s09` 最该先吃透的地方。

### 子 Agent

特点：

- 一次性创建
- 完成任务后返回摘要
- 立刻消亡
- 没有持续身份

### 队友 Agent

特点：

- 有固定名字和角色
- 能持续运行多轮
- 能从 `working` 进入 `idle`
- 能收发消息
- 能在后续再次被唤醒

你可以把它理解成：

- 子 Agent 更像函数调用
- 队友 Agent 更像长期在线的协作者

## 这一章最重要的新增概念

`team roster + mailbox + lifecycle`

也就是：

- 团队名册
- 文件邮箱
- 生命周期管理

这三样组合起来，才让“多个 Agent”不只是多个线程，而是多个有身份的成员。

## 团队名册是什么

名册的作用是记录：

- 有哪些成员
- 每个人的角色
- 当前状态如何

最常见的持久化方式就是：

```txt
.team/config.json
```

比如：

```json
{
  "members": [
    { "name": "lead", "role": "leader", "status": "working" },
    { "name": "alice", "role": "coder", "status": "idle" },
    { "name": "bob", "role": "tester", "status": "working" }
  ]
}
```

这份名册的意义在于：

- 团队结构变成可见状态
- 不是只存在于某个 prompt 里
- 重启后仍可恢复成员信息

## 生命周期为什么重要

如果一个队友只是被创建后一直乱跑，那系统会很难控制。

所以 `s09` 强调成员要有生命周期，比如：

- `working`
- `idle`
- `shutdown`

这样主 Agent 或系统就能知道：

- 谁正在干活
- 谁现在空闲
- 谁已经退出

这对协作调度非常关键。

## 文件邮箱是什么

这是 `s09` 最核心的通信机制。

做法通常是：

```txt
.team/inbox/
  alice.jsonl
  bob.jsonl
  lead.jsonl
```

每个人一个收件箱文件。

发送消息时：

- 往目标成员的 `.jsonl` 追加一行 JSON

读取消息时：

- 把整份文件读出来
- 然后清空，实现 drain-on-read

这个设计很简单，但非常实用。

## 为什么邮箱用 JSONL

因为它天然适合追加写入。

每条消息一行 JSON，有几个好处：

- append-only 很简单
- 崩溃恢复友好
- 容易排查和调试
- 不需要复杂数据库也能工作

所以它是一个非常轻量但工程上够用的消息总线。

## 一个最小消息结构

```ts
type TeamMessage = {
  type: string;
  from: string;
  content: string;
  timestamp: number;
};
```

如果要支持更复杂协议，后面还可以再加：

- `request_id`
- `approve`
- 其他扩展字段

但 `s09` 阶段先抓住“能发消息、能收消息”就够了。

## MessageBus 在 TypeScript 里怎么理解

你可以把它理解成一个文件版消息队列。

它主要做两件事：

1. `send()`
2. `readInbox()`

### `send()`

```ts
class MessageBus {
  constructor(private inboxDir: string) {}

  async send(from: string, to: string, content: string, type = "message") {
    const line = JSON.stringify({
      type,
      from,
      content,
      timestamp: Date.now(),
    });

    const file = Bun.file(`${this.inboxDir}/${to}.jsonl`);
    const current = (await file.exists()) ? await file.text() : "";
    await Bun.write(`${this.inboxDir}/${to}.jsonl`, current + line + "\n");
  }
}
```

### `readInbox()`

```ts
class MessageBus {
  async readInbox(name: string) {
    const path = `${this.inboxDir}/${name}.jsonl`;
    const file = Bun.file(path);

    if (!(await file.exists())) {
      return [];
    }

    const text = await file.text();
    await Bun.write(path, "");

    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}
```

这里最重要的点是：

`readInbox()` 不是只读不删，而是读完清空

这样消息就不会重复消费。

## 队友循环和普通 Agent 循环有什么不同

普通 Agent 循环主要只关心：

- 用户输入
- 工具调用
- 工具结果

而队友循环在每轮调用模型前，还要先做一件事：

`检查收件箱`

也就是说，消息流除了用户和工具，还多了“队友消息注入”。

## 一个简化版队友循环

```ts
async function teammateLoop(name: string, role: string, prompt: string) {
  const messages = [{ role: "user", content: prompt }];

  for (let i = 0; i < 50; i++) {
    const inbox = await bus.readInbox(name);

    if (inbox.length > 0) {
      messages.push({
        role: "user",
        content: `<inbox>${JSON.stringify(inbox)}</inbox>`,
      });

      messages.push({
        role: "assistant",
        content: "Noted inbox messages.",
      });
    }

    const response = await callModel({ messages });

    messages.push({
      role: "assistant",
      content: response.content,
    });

    if (response.stop_reason !== "tool_use") {
      break;
    }

    // ...执行工具...
  }
}
```

你可以看到，它并没有推翻原来的 Agent Loop，只是多了：

- inbox 注入
- 成员身份
- 生命周期控制

## TeammateManager 是什么

你可以把它理解成团队控制器。

它主要做：

- 维护团队名册
- 启动队友
- 更新状态
- 记录线程或运行实例

一个最小版结构可以是：

```ts
type Teammate = {
  name: string;
  role: string;
  status: "working" | "idle" | "shutdown";
};

class TeammateManager {
  private members: Teammate[] = [];

  async spawn(name: string, role: string, prompt: string) {
    this.members.push({
      name,
      role,
      status: "working",
    });

    void teammateLoop(name, role, prompt);

    return `Spawned teammate "${name}" (${role})`;
  }
}
```

真正工程里你还会把这些信息写到 `.team/config.json`，但概念上就是这样。

## 为什么持久化很关键

因为从 `s09` 开始，团队已经不只是当前这一轮对话的临时结构。

如果不把团队状态持久化，你会遇到这些问题：

- 谁在团队里会丢失
- 谁在忙会丢失
- 收件箱可能还在，但名册没了
- 恢复现场会很困难

所以 `.team/config.json + .team/inbox/*.jsonl` 这套组合很关键。

## `s09` 和 `s04` 的关系

你可以把它们这样区分：

- `s04`：一次性子任务隔离
- `s09`：长期协作成员体系

也就是说：

- 如果你只是临时查点东西，开子 Agent 即可
- 如果你需要 coder、tester、reviewer 这种长期角色，那就需要队友

这就是从“工具化委派”走向“组织化协作”。

## `s09` 和 `s08` 的关系

这点也很容易混。

- `s08` 的后台任务主要是后台跑命令
- `s09` 的队友是后台运行完整 Agent 循环

所以：

- 后台任务是 I/O 执行并发
- Agent 团队是认知协作并发

后者显然更复杂，也更强。

## 一个接近完整的最小结构

```ts
type TeammateStatus = "working" | "idle" | "shutdown";

type Teammate = {
  name: string;
  role: string;
  status: TeammateStatus;
};

type TeamMessage = {
  type: string;
  from: string;
  content: string;
  timestamp: number;
};

class MessageBus {
  constructor(private inboxDir: string) {}

  async send(from: string, to: string, content: string, type = "message") {
    const filePath = `${this.inboxDir}/${to}.jsonl`;
    const file = Bun.file(filePath);
    const current = (await file.exists()) ? await file.text() : "";

    const line = JSON.stringify({
      type,
      from,
      content,
      timestamp: Date.now(),
    } satisfies TeamMessage);

    await Bun.write(filePath, current + line + "\n");
  }

  async readInbox(name: string): Promise<TeamMessage[]> {
    const filePath = `${this.inboxDir}/${name}.jsonl`;
    const file = Bun.file(filePath);

    if (!(await file.exists())) return [];

    const text = await file.text();
    await Bun.write(filePath, "");

    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TeamMessage);
  }
}

class TeammateManager {
  private members: Teammate[] = [];

  async spawn(name: string, role: string, prompt: string) {
    this.members.push({ name, role, status: "working" });
    void teammateLoop(name, role, prompt);
    return `Spawned teammate "${name}" (${role})`;
  }
}
```

这段结构已经足够体现 `s09` 的骨架。

## 这一章最值得学的工程观念

`s09` 最重要的不是“会不会发 JSONL 消息”，而是这几个工程心法：

- 协作成员必须有身份
- 持续协作必须有生命周期
- 多 Agent 通信必须有稳定通道
- 状态要持久化，不要只存在于 prompt 里
- 一次性子任务和长期队友是两种不同组织形态

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 4 步来：

1. 先做 `.team/config.json`
2. 再做 `.team/inbox/*.jsonl`
3. 然后实现 `spawn()` 和 `send()/readInbox()`
4. 最后再给每个队友加独立循环和状态切换

这样你会比较容易从“单 Agent”走到“团队 Agent”。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Spawn alice as coder and bob as tester`
2. `Have alice send bob a message about implementation status`
3. `Read lead inbox and summarize what teammates sent back`
4. `Persist the team roster and reload it after restart`

练习时重点观察一件事：

`如果没有身份和邮箱，多个 Agent 是否只是一次性工具；有了名册和消息通道后，它们是否开始像真正团队`

## 沙箱与整队联调（`.apps`）

Lead 与所有队友的 **`bash` / `read_file` / `write_file` / `edit_file`** 都限制在：

`src/collaboration/agent-team/.apps`

- 路径为**相对 `.apps` 根**（例如 `src/snake.ts` 会写到 `.apps/src/snake.ts`），用 `../` 逃出会被拒绝。
- **`bun` 的工作目录**在跑 `s09` 时仍是仓库根，但子进程 `bash` 的 **`cwd` 固定为 `.apps`**，避免误改仓库其它文件。
- 目录名 `.apps` 已在仓库根 `.gitignore` 里忽略（任意层级的同名目录）。

**如何试整队效果**：在项目根执行 `bun run s09`（或 `bun run packages/learn-claude-code/src/collaboration/agent-team/index.ts`），用自然语言下达任务（例如「在沙箱里做一个最小贪吃蛇原型」）。联调时可在终端用 `/team` 看名册、`/inbox` 看 lead 信箱；需要 API Key（与项目其它示例相同）。自动化校验沙箱边界可运行：`bun test`（含 `sandbox-apps.test.ts`）。

## 结论

`s09` 想让你建立的核心意识是：

当系统开始进入多人协作阶段时，光有子任务已经不够了。  
你需要的是有名字、有角色、有状态、能互相通信、能跨多轮持续存在的队友体系。

换成一句最容易记的话就是：

`A team is not many prompts. A team is identity, lifecycle, and communication.`
