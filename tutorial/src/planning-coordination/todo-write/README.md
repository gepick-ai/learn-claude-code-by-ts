# s03 TodoWrite

本文基于 Learn Claude Code 的 `s03` 章节整理，沿用 `s01`、`s02` 的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么多步任务里必须显式维护计划，以及 `TodoWrite` 是如何让 Agent 不跑偏的。

参考原文：[Learn Claude Code - s03 TodoWrite](https://learn.shareai.run/zh/s03/)

## 一句话理解

`s03` 的核心是：

`先写计划，再执行；执行过程中持续更新计划`

如果说：

- `s01` 解决“Agent 怎么跑起来”
- `s02` 解决“Agent 怎么接工具”

那么 `s03` 解决的就是：

`Agent 在多步任务里，怎么不丢进度、不跳步、不跑偏`

## 为什么需要 TodoWrite

当任务只有一步两步时，模型通常还能靠短期上下文勉强记住自己在做什么。

但一旦任务变成：

- 重构一个文件
- 生成多个模块
- 修 5 个问题
- 先分析再实现再验证

模型就容易出现这些问题：

- 重复做已经做过的事
- 漏掉中间步骤
- 做着做着偏离原任务
- 只顾眼前工具结果，忘了整体目标

这不是因为模型“不会做”，而是因为长流程里，进度状态如果不显式保存，就会慢慢从注意力里滑出去。

## `s03` 真正解决的不是待办事项，而是“状态外置”

很多人第一次看 `TodoWrite`，会以为只是加了一个任务列表。

其实更本质的变化是：

`把任务进度从模型脑子里，搬到一个显式状态容器里`

也就是：

- 哪些步骤待做
- 哪一步正在做
- 哪些步骤已经完成

不再完全依赖模型临时记忆，而是放进一个稳定的结构化状态里。

这就是为什么它对长任务特别重要。

## 最小心法

这一章你可以只记住两句话：

1. `Plan before you act`
2. `Only one task can be in_progress`

第一句保证先规划后执行。  
第二句保证同一时间只聚焦一件事。

## 和 s02 的关系

你可以把 `TodoWrite` 也看成一种工具。

在 `s02` 里你已经有：

- `bash`
- `read_file`
- `write_file`
- `edit_file`

到了 `s03`，只是再加一个：

- `todo`

它和别的工具一样，会被注册进 dispatch map，但它操作的不是文件或命令，而是“任务计划状态”。

## 整体结构

从工程上看，`s03` 比 `s02` 多了两个东西：

1. `TodoManager`
   负责保存 todo 列表和状态校验
2. `nag reminder`
   如果模型太久没更新 todo，就提醒它更新

所以整体结构变成：

- `Agent Loop`
- `Tool Dispatch Map`
- `TodoManager`
- `Reminder Injection`

## TodoManager 是什么

你可以把它理解成一个小型状态机。

它主要做 3 件事：

1. 保存任务列表
2. 校验任务状态是否合法
3. 把当前计划渲染成模型可见文本

最重要的约束是：

`同一时间只允许一个任务处于 in_progress`

这个限制看起来很简单，但非常关键，因为它在强迫 Agent 聚焦。

## 为什么只能有一个 `in_progress`

因为如果你允许多个任务同时进行，模型很容易变成：

- 一会儿改代码
- 一会儿读文档
- 一会儿加测试
- 一会儿又回去修前面的东西

结果就是：

- 上下文切换频繁
- 步骤顺序混乱
- 完成率下降

所以 `s03` 的设计不是追求“并行感”，而是追求“持续推进感”。

## TypeScript 里怎么定义 Todo 项

最简单的建模可以这样写：

```ts
type TodoStatus = "pending" | "in_progress" | "completed";

type TodoItem = {
  id: string;
  text: string;
  status: TodoStatus;
};
```

如果你要更贴近真实工程，也可以加上 `cancelled`，但 `s03` 的最小心智模型先抓住上面这 3 个状态就够了。

## 一个最小 TodoManager

下面是一个接近 `s03` 思路的 TypeScript 版本：

```ts
type TodoStatus = "pending" | "in_progress" | "completed";

type TodoItem = {
  id: string;
  text: string;
  status: TodoStatus;
};

class TodoManager {
  private items: TodoItem[] = [];

  update(items: TodoItem[]) {
    const inProgressCount = items.filter(
      (item) => item.status === "in_progress",
    ).length;

    if (inProgressCount > 1) {
      throw new Error("Only one task can be in_progress");
    }

    this.items = items;
    return this.render();
  }

  render() {
    if (this.items.length === 0) {
      return "No todos yet.";
    }

    return this.items
      .map((item) => `- [${this.icon(item.status)}] ${item.text}`)
      .join("\n");
  }

  private icon(status: TodoStatus) {
    if (status === "completed") return "x";
    if (status === "in_progress") return ">";
    return " ";
  }
}
```

你会发现，它本质上并不复杂，关键不在代码量，而在这个状态结构一旦存在，Agent 的行为就开始被计划约束。

## 把 `todo` 工具接进 dispatch map

和 `s02` 一样，`todo` 不是特殊流程，而是普通工具注册：

```ts
const todoManager = new TodoManager();

const toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: async (input) => {
    const items = input.items as TodoItem[];
    return todoManager.update(items);
  },
};
```

这点非常重要：

`s03` 不是另起一套规划系统，而是把“计划”也做成一个工具`

这样主循环仍然不用改很多。

## 主循环增加了什么

和 `s02` 相比，主循环最主要的新增点是：

1. 增加一个计数器，记录模型已经多少轮没更新 todo
2. 如果连续几轮都没碰 todo，就插入提醒

也就是说，循环主体没有被推翻，只是多了“计划监督机制”。

## `roundsSinceTodo` 的作用

你可以这样理解它：

- 模型调用一次 `todo`，计数器归零
- 模型连续几轮没更新 `todo`，计数器递增
- 超过阈值，就提醒它“别忘了更新计划”

这解决的是一个很现实的问题：

模型不是不知道要规划，而是做着做着就忘了。

所以 `nag reminder` 不是装饰，它是在给模型加“外部约束”。

## 一个简化版的 reminder 机制

```ts
let roundsSinceTodo = 0;

function noteToolUsage(toolName: string) {
  if (toolName === "todo") {
    roundsSinceTodo = 0;
    return;
  }

  roundsSinceTodo += 1;
}
```

然后在合适的时候注入提醒：

```ts
function maybeInjectReminder(messages: Array<{ role: string; content: unknown }>) {
  if (roundsSinceTodo < 3) return;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return;

  if (Array.isArray(lastMessage.content)) {
    lastMessage.content.unshift({
      type: "text",
      text: "<reminder>Update your todos.</reminder>",
    });
  }
}
```

这就是 `s03` 里那个“追着你更新计划”的机制。

## 为什么 reminder 有用

因为在真实多步任务里，模型常见的问题不是不会列计划，而是：

- 一开始列了
- 做了 2 步
- 后面就忘了维护

一旦 todo 长时间不更新，列表就会逐渐失真：

- 实际完成了，但没标记完成
- 实际已经开始新任务了，但还没把状态切到 `in_progress`
- 中途插入了新步骤，但列表没反映

reminder 的作用就是让计划保持“活着”，而不是只在开头写一次。

## 用 TypeScript 理解 `s03` 的本质

你可以把它抽象成一句话：

`LLM 不适合自己默默记住长流程状态，所以要把状态写到工具里`

这和前端把 UI 状态放进 store、后端把任务状态放进数据库，其实是同一个思想：

`重要状态不能只存在于脑海里`

## 一个接近完整的最小结构

```ts
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

type TodoStatus = "pending" | "in_progress" | "completed";

type TodoItem = {
  id: string;
  text: string;
  status: TodoStatus;
};

class TodoManager {
  private items: TodoItem[] = [];

  update(items: TodoItem[]) {
    const inProgressCount = items.filter(
      (item) => item.status === "in_progress",
    ).length;

    if (inProgressCount > 1) {
      throw new Error("Only one task can be in_progress");
    }

    this.items = items;
    return this.render();
  }

  render() {
    return this.items
      .map((item) => `${item.status}: ${item.text}`)
      .join("\n");
  }
}

const todoManager = new TodoManager();

const toolHandlers: Record<string, (input: ToolInput) => Promise<string>> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: async (input) => todoManager.update(input.items as TodoItem[]),
};

let roundsSinceTodo = 0;

async function runToolCall(block: ToolUseBlock): Promise<ToolResultBlock> {
  const handler = toolHandlers[block.name];

  const content = handler
    ? await handler(block.input)
    : `Unknown tool: ${block.name}`;

  if (block.name === "todo") {
    roundsSinceTodo = 0;
  } else {
    roundsSinceTodo += 1;
  }

  return {
    type: "tool_result",
    tool_use_id: block.id,
    content,
  };
}
```

这段代码就已经能体现 `s03` 的工程骨架。

## 和普通 todo list 的区别

这不是给人看的个人待办，而是给模型看的“执行控制面板”。

差别在于：

- 它不是装饰信息
- 它会影响模型下一步行为
- 它是执行闭环的一部分

所以不要把它理解成“顺手记一下任务”，而要理解成“把执行状态显式暴露给 Agent”。

## 什么时候必须用 TodoWrite

当任务具备这些特征时，`TodoWrite` 几乎就很有必要：

- 任务需要 3 步以上
- 涉及分析、修改、验证多个阶段
- 可能跨多个文件
- 中途可能插入新步骤
- 你希望 Agent 明确展示当前进度

如果只是：

- 回答一个问题
- 改一行代码
- 读一个文件

那就未必需要。

## 一个典型工作流

比如用户说：

`请重构 auth 模块，加上类型、补测试、修复一个 edge case`

更合理的 Agent 行为应该是：

1. 先写 todo
2. 读相关文件
3. 把“分析 auth 结构”标成完成
4. 把“修改 auth 实现”设为 `in_progress`
5. 改完后标完成
6. 再把“补测试”设为 `in_progress`
7. 最后把“运行验证”设为 `in_progress`

这样整个长任务就有了可追踪的推进顺序。

## `s03` 最值得学的工程观念

这章最重要的其实不是 `TodoWrite` 这个名字，而是这几个工程心法：

- 长流程一定要显式化进度
- 计划不是一次性输出，而要持续维护
- 状态要可校验，不能随便写
- 同时只推进一个关键步骤，完成率更高
- 如果模型忘了维护计划，系统要主动提醒

## 对 TypeScript 初学实现的建议

如果你要自己在 Bun 项目里做一个最小版，不要一上来做太复杂。

建议分 3 步：

1. 先实现 `TodoItem` 和 `TodoManager`
2. 再把 `todo` 注册进 `toolHandlers`
3. 最后再补 `roundsSinceTodo` 和 reminder

这样你会更容易理解每一层到底在解决什么问题。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Refactor index.ts to extract a helper function and update the README`
2. `Create a small TypeScript utility module with tests`
3. `Review the project files and improve the project structure`

练习时重点观察一件事：

`没有 todo 时，Agent 会不会更容易跳步；有 todo 后，行为是否更稳定`

## 结论

`s03` 想让你建立的核心意识是：

多步任务不能只靠模型临时记忆，必须把计划和进度变成可见、可更新、可校验的外部状态。

换成一句最容易记的话就是：

`A capable agent needs memory for progress, not just memory for conversation.`
