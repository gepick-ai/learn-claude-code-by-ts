# s10 团队协议

本文基于 Learn Claude Code 的 `s10` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么“能发消息”还不够，以及团队协作为什么需要统一的 request-response 协议。

参考原文：[Learn Claude Code - s10 团队协议](https://learn.shareai.run/zh/s10/)

## 一句话理解

`s10` 的核心是：

`队友之间不只要能说话，还要按同一种规矩说话`

也可以记成：

`自由消息适合交流，结构化协议适合协作`

## 为什么需要团队协议

到了 `s09`，你已经有了：

- 持久化队友
- 团队名册
- 文件邮箱
- 基本消息收发

这已经能让 Agent 团队“聊起来”，但“能聊天”并不等于“能稳定协作”。

因为一旦进入更严肃的协作场景，单纯发一条自由文本消息会有很多问题：

- 谁发起的请求？
- 请求和响应怎么对应起来？
- 现在是等待中、已批准还是已拒绝？
- 如果多个相似请求同时进行，怎么区分？

所以 `s10` 解决的不是通信能力，而是：

`结构化协商能力`

## `s10` 真正解决的核心问题

这一章本质上在解决：

`多个 Agent 之间如何围绕同一件事达成可跟踪、可审计、可状态化的协商`

重点不是消息本身，而是：

- 请求有唯一 ID
- 响应引用同一个 ID
- 系统追踪状态变化

这就是协议层的意义。

## 为什么自由文本消息不够

假设领导发给 alice：

`请优雅地停机`

alice 回：

`好的`

看起来很自然，但工程上其实很脆弱：

- 这条“好的”到底对应哪一次请求？
- 如果同时还有另一条计划审批消息怎么办？
- 领导怎么知道这件事是 pending、approved 还是 rejected？

所以 `s10` 要引入：

`request-response + request_id + FSM`

## 什么是 request-response 协议

最简单地说，就是：

1. 一方发起请求
2. 请求带唯一 `request_id`
3. 另一方回应时必须引用同一个 `request_id`
4. 系统根据回应更新该请求状态

## 为什么 `request_id` 很关键

因为它让“这一来一回”变成了可关联的一组事件。

例如请求：

```json
{
  "type": "shutdown_request",
  "request_id": "abc123",
  "from": "lead",
  "to": "alice"
}
```

对应响应：

```json
{
  "type": "shutdown_response",
  "request_id": "abc123",
  "from": "alice",
  "approve": true
}
```

## 为什么这一章强调 FSM

因为协议还包含状态流转。

最基础的状态机就是：

`pending -> approved | rejected`

这说明：

- 请求发出时是 `pending`
- 收到批准后变成 `approved`
- 收到拒绝后变成 `rejected`

## 两个典型协议场景

最典型的是两类：

1. `shutdown protocol`
2. `plan approval protocol`

看起来是两个功能，但骨架完全一样。

## 场景一：优雅停机

为什么停机需要协议？

因为你不能直接粗暴杀掉队友线程。那样会带来风险：

- 正在写文件写到一半
- 正在更新状态没写完
- 团队名册状态失真

所以更合理的方式是：

1. 领导发起停机请求
2. 队友根据当前状态决定批准或拒绝
3. 如果批准，自己做收尾，然后退出

## 场景二：计划审批

为什么计划审批也需要协议？

因为有些任务风险较高，不该让队友收到一句任务描述就立刻开干。

更合理的做法是：

1. 队友先提交计划
2. 领导审查
3. 领导批准或拒绝
4. 队友再执行

## 一个最小请求类型

```ts
type ProtocolStatus = "pending" | "approved" | "rejected";

type ProtocolRequest = {
  requestId: string;
  type: string;
  from: string;
  to: string;
  status: ProtocolStatus;
  content: string;
};
```

## TypeScript 里怎么建模 shutdown 请求

```ts
type ShutdownRequest = {
  requestId: string;
  target: string;
  status: "pending" | "approved" | "rejected";
};

const shutdownRequests = new Map<string, ShutdownRequest>();
```

发起请求时：

```ts
async function requestShutdown(teammate: string) {
  const requestId = crypto.randomUUID().slice(0, 8);

  shutdownRequests.set(requestId, {
    requestId,
    target: teammate,
    status: "pending",
  });

  await bus.send("lead", teammate, "Please shut down gracefully.", "shutdown_request");

  return `Shutdown request ${requestId} sent`;
}
```

## TypeScript 里怎么处理 shutdown 响应

```ts
async function handleShutdownResponse(
  requestId: string,
  approve: boolean,
  from: string,
) {
  const request = shutdownRequests.get(requestId);
  if (!request) {
    throw new Error(`Unknown shutdown request: ${requestId}`);
  }

  request.status = approve ? "approved" : "rejected";

  await bus.send(
    from,
    "lead",
    approve ? "Approved shutdown." : "Rejected shutdown.",
    "shutdown_response",
  );
}
```

## 计划审批怎么套用同样模式

```ts
type PlanRequest = {
  requestId: string;
  from: string;
  plan: string;
  status: "pending" | "approved" | "rejected";
};

const planRequests = new Map<string, PlanRequest>();
```

流程是：

1. 队友提交计划，生成 `requestId`
2. 领导收到后查看计划
3. 领导调用 `approve/reject`
4. 系统更新状态并发回响应

## 队友循环里协议怎么工作

协议消息本质上还是会通过邮箱流转，所以队友在读 inbox 时，不只是看普通消息，还要识别：

- `shutdown_request`
- `shutdown_response`
- `plan_approval_request`
- `plan_approval_response`

## 一个简化版 inbox 处理逻辑

```ts
async function handleInboxMessage(message: TeamMessage) {
  switch (message.type) {
    case "shutdown_request":
      break;
    case "shutdown_response":
      break;
    case "plan_approval_request":
      break;
    case "plan_approval_response":
      break;
    default:
      break;
  }
}
```

## 和 `s09`、`s11` 的关系

- `s09` 提供通道
- `s10` 提供规则
- `s11` 在这些规则之上实现更强自治

所以 `s10` 是协作系统的制度层。

## 一个接近完整的最小结构

```ts
type RequestStatus = "pending" | "approved" | "rejected";

type ShutdownRequest = {
  requestId: string;
  target: string;
  status: RequestStatus;
};

type PlanRequest = {
  requestId: string;
  from: string;
  plan: string;
  status: RequestStatus;
};

const shutdownRequests = new Map<string, ShutdownRequest>();
const planRequests = new Map<string, PlanRequest>();

async function requestShutdown(teammate: string) {
  const requestId = crypto.randomUUID().slice(0, 8);

  shutdownRequests.set(requestId, {
    requestId,
    target: teammate,
    status: "pending",
  });

  await bus.send("lead", teammate, JSON.stringify({ requestId }), "shutdown_request");
  return `Shutdown request ${requestId} sent`;
}

async function respondShutdown(requestId: string, approve: boolean) {
  const request = shutdownRequests.get(requestId);
  if (!request) throw new Error(`Unknown request: ${requestId}`);

  request.status = approve ? "approved" : "rejected";

  await bus.send(
    request.target,
    "lead",
    JSON.stringify({ requestId, approve }),
    "shutdown_response",
  );
}
```

## 这一章最值得学的工程观念

- 协作需要统一协议，不靠自由发挥
- 请求和响应必须可关联
- 状态必须显式化，不能只靠语言猜测
- 高风险操作需要审批或握手
- 协议最好复用同一个状态机骨架

## 结论

`s10` 想让你建立的核心意识是：

团队协作不能只靠自然语言默契。真正可扩展的多 Agent 系统，需要结构化的请求-响应协议，把协商过程变成可追踪、可审批、可恢复的状态流。

换成一句最容易记的话就是：

`Communication becomes coordination only when requests have structure, identity, and state.`
# s10 团队协议

本文基于 Learn Claude Code 的 `s10` 章节整理，沿用前面几篇的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么“能发消息”还不够，以及团队协作为什么需要统一的 request-response 协议。

参考原文：[Learn Claude Code - s10 团队协议](https://learn.shareai.run/zh/s10/)

## 一句话理解

`s10` 的核心是：

`队友之间不只要能说话，还要按同一种规矩说话`

也可以记成：

`自由消息适合交流，结构化协议适合协作`

## 为什么需要团队协议

到了 `s09`，你已经有了：

- 持久化队友
- 团队名册
- 文件邮箱
- 基本消息收发

这已经能让 Agent 团队“聊起来”。  
但“能聊天”并不等于“能稳定协作”。

因为一旦进入更严肃的协作场景，单纯发一条自由文本消息会有很多问题：

- 谁发起的请求？
- 请求和响应怎么对应起来？
- 现在是等待中、已批准还是已拒绝？
- 如果多个相似请求同时进行，怎么区分？

所以 `s10` 解决的不是通信能力，而是：

`结构化协商能力`

## `s10` 真正解决的核心问题

这一章本质上在解决：

`多个 Agent 之间如何围绕同一件事达成可跟踪、可审计、可状态化的协商`

重点不是消息本身，而是：

- 请求有唯一 ID
- 响应引用同一个 ID
- 系统追踪状态变化

这就是协议层的意义。

## 为什么自由文本消息不够

假设领导发给 alice：

`请优雅地停机`

alice 回：

`好的`

看起来很自然，但工程上其实很脆弱：

- 这条“好的”到底对应哪一次请求？
- 如果同时还有另一条计划审批消息怎么办？
- 领导怎么知道这件事是 pending、approved 还是 rejected？

自由文本能表达意思，但不适合做系统级协调。

所以 `s10` 要引入：

`request-response + request_id + FSM`

## 什么是 request-response 协议

最简单地说，就是：

1. 一方发起请求
2. 请求带唯一 `request_id`
3. 另一方回应时必须引用同一个 `request_id`
4. 系统根据回应更新该请求状态

这个模式很常见：

- HTTP 请求与响应
- RPC 调用
- 审批流
- 任务确认流

`s10` 只是把它搬进 Agent 团队内部通信。

## 为什么 `request_id` 很关键

因为它让“这一来一回”变成了可关联的一组事件。

例如：

```json
{
  "type": "shutdown_request",
  "request_id": "abc123",
  "from": "lead",
  "to": "alice"
}
```

对应的响应可能是：

```json
{
  "type": "shutdown_response",
  "request_id": "abc123",
  "from": "alice",
  "approve": true
}
```

这样系统就知道：

- 这不是随便一条“同意”
- 它是在回应 `abc123`

这会让整个协作系统变得可追踪。

## 为什么这一章强调 FSM

因为协议不是发一条请求就完了，它还包含状态流转。

最基础的状态机就是：

`pending -> approved | rejected`

也就是说：

- 请求发出时是 `pending`
- 收到批准后变成 `approved`
- 收到拒绝后变成 `rejected`

这就是一个最小有限状态机。

一旦你接受这个思路，就会发现：

- 停机请求可以复用这个状态机
- 计划审批也可以复用这个状态机

这正是 `s10` 的漂亮之处。

## 两个典型协议场景

原文里最典型的是两类：

1. `shutdown protocol`
2. `plan approval protocol`

看起来是两个功能，但骨架其实完全一样。

## 场景一：优雅停机

为什么停机需要协议？

因为你不能直接粗暴杀掉队友线程。  
那样会带来风险：

- 正在写文件写到一半
- 正在更新状态没写完
- 团队名册状态失真
- 现场残留不一致

所以更合理的方式是：

1. 领导发起停机请求
2. 队友根据当前状态决定批准或拒绝
3. 如果批准，自己做收尾，然后退出

这本质上就是一个 request-response 协议。

## 场景二：计划审批

为什么计划审批也需要协议？

因为有些任务风险较高，不该让队友收到一句任务描述就立刻开干。

例如：

- 重构认证模块
- 大规模迁移配置
- 删除旧逻辑
- 重写核心接口

更合理的做法是：

1. 队友先提交计划
2. 领导审查
3. 领导批准或拒绝
4. 队友再执行

这依然是同一个模式：

- 发请求
- 等响应
- 根据结果推进或中止

## 这两个协议为什么可以共用一套骨架

因为它们抽象后其实都是：

- 发起方
- 接收方
- `request_id`
- `pending`
- `approved/rejected`

换句话说：

`协议类型不同，但状态机相同`

这说明你不需要为每个团队行为都新发明一套机制，而是可以在一个通用 request tracker 上扩展。

## 一个最小请求类型

```ts
type ProtocolStatus = "pending" | "approved" | "rejected";

type ProtocolRequest = {
  requestId: string;
  type: string;
  from: string;
  to: string;
  status: ProtocolStatus;
  content: string;
};
```

如果你要支持不同协议，还可以按需扩展字段，但这个骨架已经足够表达核心思想。

## TypeScript 里怎么建模 shutdown 请求

最简单的做法可以是：

```ts
type ShutdownRequest = {
  requestId: string;
  target: string;
  status: "pending" | "approved" | "rejected";
};

const shutdownRequests = new Map<string, ShutdownRequest>();
```

发起请求时：

```ts
async function requestShutdown(teammate: string) {
  const requestId = crypto.randomUUID().slice(0, 8);

  shutdownRequests.set(requestId, {
    requestId,
    target: teammate,
    status: "pending",
  });

  await bus.send("lead", teammate, "Please shut down gracefully.", "shutdown_request");

  return `Shutdown request ${requestId} sent`;
}
```

更完整一点时，你会把 `request_id` 放进消息正文或扩展字段里。

## TypeScript 里怎么处理 shutdown 响应

```ts
async function handleShutdownResponse(
  requestId: string,
  approve: boolean,
  from: string,
) {
  const request = shutdownRequests.get(requestId);
  if (!request) {
    throw new Error(`Unknown shutdown request: ${requestId}`);
  }

  request.status = approve ? "approved" : "rejected";

  await bus.send(
    from,
    "lead",
    approve ? "Approved shutdown." : "Rejected shutdown.",
    "shutdown_response",
  );
}
```

这段代码的关键不是消息文案，而是：

- 通过 `requestId` 找回原请求
- 把状态从 `pending` 改掉

## 计划审批怎么套用同样模式

计划审批其实也一样：

```ts
type PlanRequest = {
  requestId: string;
  from: string;
  plan: string;
  status: "pending" | "approved" | "rejected";
};

const planRequests = new Map<string, PlanRequest>();
```

流程大概是：

1. 队友提交计划，生成 `requestId`
2. 领导收到后查看计划
3. 领导调用 `approve/reject`
4. 系统更新状态并发回响应

这就是“同一个 FSM，套两种用途”。

## 为什么协议层是协作系统的分水岭

因为从这章开始，团队不再只是：

- 能互相留言

而开始变成：

- 能围绕正式请求进行协商

这会直接提升团队行为的：

- 可控性
- 可解释性
- 可审计性
- 可恢复性

也就是说，团队从“会说话”变成了“会按制度办事”。

## 队友循环里协议怎么工作

协议消息本质上还是会通过邮箱流转，所以队友在读 inbox 时，不只是看普通消息，还要识别：

- `shutdown_request`
- `shutdown_response`
- `plan_approval_request`
- `plan_approval_response`

也就是说，邮箱消息从“自由文本容器”升级成“协议事件容器”。

## 一个简化版 inbox 处理逻辑

```ts
async function handleInboxMessage(message: TeamMessage) {
  switch (message.type) {
    case "shutdown_request":
      // 决定 approve / reject
      break;
    case "shutdown_response":
      // 更新 tracker
      break;
    case "plan_approval_request":
      // 领导审查计划
      break;
    case "plan_approval_response":
      // 队友根据结果继续或修改计划
      break;
    default:
      // 普通消息
      break;
  }
}
```

这说明 `s10` 并没有抛弃邮箱系统，而是在邮箱之上加了一层协议语义。

## 和 `s09` 的关系

你可以把这两章连起来理解：

- `s09` 解决“队友怎么存在与通信”
- `s10` 解决“队友怎么按统一规则协商”

也就是说：

- `s09` 提供通道
- `s10` 提供规则

两者缺一不可。

## 和 `s11` 的关系

这点也很重要。

到了 `s11`，队友会开始更加自主地认领任务。  
但自主不代表完全无约束。

很多高风险动作依然需要协议，比如：

- 提交计划先审批
- 请求停机要握手

所以 `s10` 是给后续“自治”提供边界和秩序。

## 一个接近完整的最小结构

```ts
type RequestStatus = "pending" | "approved" | "rejected";

type ShutdownRequest = {
  requestId: string;
  target: string;
  status: RequestStatus;
};

type PlanRequest = {
  requestId: string;
  from: string;
  plan: string;
  status: RequestStatus;
};

const shutdownRequests = new Map<string, ShutdownRequest>();
const planRequests = new Map<string, PlanRequest>();

async function requestShutdown(teammate: string) {
  const requestId = crypto.randomUUID().slice(0, 8);

  shutdownRequests.set(requestId, {
    requestId,
    target: teammate,
    status: "pending",
  });

  await bus.send("lead", teammate, JSON.stringify({ requestId }), "shutdown_request");
  return `Shutdown request ${requestId} sent`;
}

async function respondShutdown(requestId: string, approve: boolean) {
  const request = shutdownRequests.get(requestId);
  if (!request) throw new Error(`Unknown request: ${requestId}`);

  request.status = approve ? "approved" : "rejected";

  await bus.send(
    request.target,
    "lead",
    JSON.stringify({ requestId, approve }),
    "shutdown_response",
  );
}
```

这段结构已经能很好体现 `s10` 的协议骨架。

## 这一章最值得学的工程观念

`s10` 最重要的不是“会不会做 request_id”，而是这几个工程心法：

- 协作需要统一协议，不靠自由发挥
- 请求和响应必须可关联
- 状态必须显式化，不能只靠语言猜测
- 高风险操作需要审批或握手
- 协议最好复用同一个状态机骨架

## 对 Bun + TypeScript 初学实现的建议

如果你要自己做一个最小版，建议按这 4 步来：

1. 先给消息结构加 `requestId`
2. 再实现一个通用的 request tracker
3. 先落地 shutdown 协议
4. 再复用同一套机制做 plan approval

这样你会更容易看到“协议复用”的力量。

## 推荐练习

你可以让自己的最小 Agent 尝试处理这些任务：

1. `Request alice to shut down gracefully`
2. `Have bob submit a plan and let lead approve it`
3. `Reject a plan and observe how the teammate reacts`
4. `Track multiple pending requests and correlate each response`

练习时重点观察一件事：

`如果没有 request_id，多个请求是否很快混乱；有了统一协议后，团队行为是否更稳定可控`

## 结论

`s10` 想让你建立的核心意识是：

团队协作不能只靠自然语言默契。  
真正可扩展的多 Agent 系统，需要结构化的请求-响应协议，把协商过程变成可追踪、可审批、可恢复的状态流。

换成一句最容易记的话就是：

`Communication becomes coordination only when requests have structure, identity, and state.`
