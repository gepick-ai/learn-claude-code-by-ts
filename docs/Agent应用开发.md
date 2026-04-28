# Agent 应用开发指南

## 目录
1. [架构分层](#架构分层)
2. [从 Terminal 到 Web 的过渡](#从-terminal-到-web-的过渡)
3. [核心层设计](#核心层设计)
4. [交互层设计](#交互层设计)
5. [Web 形态模块拆分详解](#web-形态模块拆分详解)
6. [会话存储设计](#会话存储设计)
7. [API 接口设计](#api-接口设计)

---

## 架构分层

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         交互层（非核心）                              │
│  ┌──────────────────────┐         ┌──────────────────────────┐    │
│  │   Terminal (CLI)     │         │      Web (Hono)          │    │
│  │  - readline          │         │  - HTTP 服务器            │    │
│  │  - console.log       │         │  - API 路由               │    │
│  │  - 单用户            │         │  - 会话管理               │    │
│  └──────────┬───────────┘         │  - 前端 HTML/JS          │    │
│             │                     └───────────┬──────────────┘    │
└─────────────┼──────────────────────────────────┼───────────────────┘
              │                                  │
              ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Agent 核心层（核心）                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  agentLoop()                    ← 核心循环                    │  │
│  │  ┌───────────────────────────────────────────────────────┐   │  │
│  │  │  1. 接收 prompt                                         │   │  │
│  │  │  2. 调用 LLM (Anthropic API)                           │   │  │
│  │  │  3. 判断是否调用工具                                    │   │  │
│  │  │  4. 执行工具 (bash/read/write/edit)                    │   │  │
│  │  │  5. 回填工具结果                                        │   │  │
│  │  │  6. 回到第 2 步，直到 stop_reason != "tool_use"        │   │  │
│  │  └───────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌──────────────────┐  ┌───────────────────────────────┐   │  │
│  │  │   Tools (工具)   │  │    Memory (记忆)               │   │  │
│  │  │  - bash          │  │  - 会话历史                    │   │  │
│  │  │  - read_file     │  │  - 上下文压缩                  │   │  │
│  │  │  - write_file    │  │  - Todo 列表                  │   │  │
│  │  │  - edit_file     │  │                                │   │  │
│  │  └──────────────────┘  └───────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      基础设施层（底层）                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Anthropic SDK (LLM API)                                       │  │
│  │  File System (文件系统)                                          │  │
│  │  Environment Variables (环境变量)                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 分层原则

- **核心层**：Agent 的业务逻辑，与交互方式无关
- **交互层**：可替换的外壳，Terminal、Web、Discord 等都是不同的交互方式
- **基础设施层**：底层依赖，如 LLM API、文件系统等

---

## 从 Terminal 到 Web 的过渡

### 为什么需要过渡？

- Terminal：单用户、本地运行、命令行界面
- Web：多用户、远程访问、浏览器界面

### 核心对比

| 方面 | Terminal | Web | 变了吗？ |
|---|---|---|---|
| **输入方式** | `readline.question()` | `HTTP Request` | ✅ 变 |
| **输出方式** | `console.log()` | `HTTP Response` | ✅ 变 |
| **会话管理** | 全局变量 | `Map<sessionId, messages>` | ✅ 变 |
| **agentLoop** | 一样 | 一样 | ❌ 不变 |
| **工具调用** | 一样 | 一样 | ❌ 不变 |
| **LLM 调用** | 一样 | 一样 | ❌ 不变 |

### 为什么 Web 需要 Session ID？

**Terminal：只有一个用户**
```
全局 messages = []
你输入 → agentLoop → 输出
全程都是「你」一个人用
```

**Web：多个用户同时用**
```
Map {
  "session-A": [用户 A 的消息],
  "session-B": [用户 B 的消息],
  "session-C": [用户 C 的消息],
}
需要用 sessionId 区分是谁发的消息
```

---

## 核心层设计

### 文件位置

```
tutorial/src/
├── common/
│   ├── main.ts           # Terminal 入口
│   └── tools/fs.ts       # 工具实现
│
└── tools-execution/
    └── agent-loop/index.ts  # s01: agentLoop 实现

packages/app/
└── agent/…               # 从 s01 提取的核心逻辑（如 core.ts）
```

### agentLoop 核心逻辑

```typescript
async function agentLoop(
  prompt: string,
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.MessageParam[]> {
  // 1. 添加用户消息
  messages.push({ role: "user", content: prompt });

  // 2. 循环：调用 LLM → 执行工具 → 回填结果
  while (true) {
    const response = await AUTH.messages.create({
      model: MODEL,
      system: SYSTEM,
      messages,
      tools: TOOLS,
      max_tokens: 8000,
    });

    messages.push({
      role: "assistant",
      content: response.content,
    });

    // 如果没有调用工具，就结束
    if (response.stop_reason !== "tool_use") {
      break;
    }

    // 执行工具调用
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        let output = await bash(block.input);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: output,
        });
      }
    }

    // 把工具结果回填给 LLM
    messages.push({
      role: "user",
      content: results,
    });
  }

  return messages;
}
```

---

## 交互层设计

### Web 交互层的 5 个组成部分

| 部分 | 文件 | 作用 |
|---|---|---|
| 1. HTTP 服务器 | `app/index.ts` | 监听端口，接收请求 |
| 2. API 路由 | `app/api-routes.ts` | 定义 API 接口 |
| 3. 会话管理 | `app/session-store.ts` | 多用户隔离 |
| 4. 前端界面 | `app/frontend.html` | 浏览器界面 |
| 5. 数据格式转换 | `app/api-routes.ts` | HTTP ↔ Agent 数据转换 |

### 文件结构

```
app/
├── index.ts              # Web 服务器入口
├── api-routes.ts         # API 路由定义
├── session-store.ts      # 会话存储
├── agent-core.ts         # Agent 核心逻辑（从 s01 提取）
└── frontend.html         # 前端界面
```

---

## Web 形态模块拆分详解

### 当前文件结构

```
app/
├── index.ts              # 1. 服务器入口
├── api-routes.ts         # 2. API 路由层
├── session-store.ts      # 3. 会话存储层
├── agent-core.ts         # 4. Agent 核心层（从 s01 提取）
└── frontend.html         # 5. 前端界面
```

---

### 模块 1：服务器入口 (`app/index.ts`)

**职责**：
- 创建 Hono 应用实例
- 配置中间件（CORS 等）
- 挂载路由
- 启动 HTTP 服务器

**代码示例**：
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import apiRoutes from "./api-routes";

const app = new Hono();
app.use(cors());

// 挂载 API 路由
app.route("/api", apiRoutes);

// 前端页面
app.get("/", async (c) => {
  return c.html(await Bun.file("./app/frontend.html").text());
});

export default {
  port: 3000,
  fetch: app.fetch,
};
```

---

### 模块 2：API 路由层 (`app/api-routes.ts`)

**职责**：
- 定义 API 端点
- 解析 HTTP 请求
- 调用会话存储
- 调用 Agent 核心
- 返回 HTTP 响应

**包含的接口**：
| 接口 | 方法 | 作用 |
|---|---|---|
| `/api/session` | POST | 创建新会话 |
| `/api/session/:sessionId` | GET | 获取会话历史 |
| `/api/session/:sessionId/message` | POST | 发送消息 |

**代码结构**：
```typescript
import { Hono } from "hono";
import { agentLoop } from "./agent-core";
import * as sessionStore from "./session-store";

const api = new Hono();

// POST /api/session - 创建会话
api.post("/session", (c) => { ... });

// GET /api/session/:sessionId - 获取会话
api.get("/session/:sessionId", (c) => { ... });

// POST /api/session/:sessionId/message - 发送消息
api.post("/session/:sessionId/message", async (c) => {
  // 1. 解析请求
  const sessionId = c.req.param("sessionId");
  const { message } = await c.req.json();

  // 2. 获取会话
  let messages = sessionStore.getSession(sessionId) || [];

  // 3. 调用 Agent 核心
  messages = await agentLoop(message, messages);

  // 4. 保存会话
  sessionStore.saveSession(sessionId, messages);

  // 5. 返回响应
  return c.json({ success: true, response: "..." });
});

export default api;
```

---

### 模块 3：会话存储层 (`app/session-store.ts`)

**职责**：
- 管理多个会话
- 提供 CRUD 操作
- 隔离不同用户的数据

**核心数据结构**：
```typescript
// sessionId -> messages[]
const sessions = new Map<string, Anthropic.MessageParam[]>();
```

**导出的函数**：
| 函数 | 作用 |
|---|---|
| `createSession()` | 创建新会话，返回 sessionId |
| `getSession(sessionId)` | 获取会话的消息列表 |
| `saveSession(sessionId, messages)` | 保存会话的消息列表 |

---

### 模块 4：Agent 核心层 (`app/agent-core.ts`)

**职责**：
- 封装 LLM 调用
- 实现 agentLoop 核心循环
- 工具调用执行
- 这部分与 Terminal 版本完全一样！

**导出的内容**：
| 内容 | 说明 |
|---|---|
| `AUTH` | Anthropic 客户端实例 |
| `MODEL` | 模型 ID |
| `SYSTEM` | 系统提示词 |
| `TOOLS` | 工具定义数组 |
| `agentLoop(prompt, messages)` | 核心循环函数 |

**关键点**：这个文件可以直接从 `tutorial/src/tools-execution/agent-loop/index.ts` 复制过来，代码完全一样！

---

### 模块 5：前端界面 (`app/frontend.html`)

**职责**：
- 渲染聊天界面
- 处理用户输入
- 调用后端 API
- 显示消息历史

**核心功能**：
```javascript
// 1. 页面加载时初始化
async function init() {
  // 调用 POST /api/session 创建会话
  const res = await fetch('/api/session', { method: 'POST' });
  const { sessionId } = await res.json();
  // 保存 sessionId，解锁输入框
}

// 2. 发送消息
async function sendMessage() {
  // 调用 POST /api/session/:sessionId/message 发送消息
  const res = await fetch(`/api/session/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  // 显示回复
}
```

---

### 模块间依赖关系

```
index.ts (服务器入口)
    │
    ├──> api-routes.ts (API 路由)
    │       │
    │       ├──> session-store.ts (会话存储)
    │       │
    │       └──> agent-core.ts (Agent 核心)
    │
    └──> frontend.html (前端界面)
            │
            └──> (通过 HTTP 调用 api-routes)
```

---

### 各模块的可替换性

| 模块 | 能否替换 | 替换成什么 |
|---|---|---|
| `index.ts` | ✅ | 可以换成 Express、Koa 等 |
| `api-routes.ts` | ✅ | 可以改成 GraphQL、gRPC 等 |
| `session-store.ts` | ✅ | 可以换成 Redis、数据库等 |
| `agent-core.ts` | ❌ | 核心逻辑，与交互方式无关 |
| `frontend.html` | ✅ | 可以换成 React、Vue、移动端等 |

---

## 会话存储设计

### 渐进式设计：先用内存，再加持久化

#### 第 1 步：内存存储（开发阶段）

```typescript
// app/session-store.ts
const sessions = new Map<string, Anthropic.MessageParam[]>();

export function createSession(): string {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, []);
  return sessionId;
}

export function getSession(sessionId: string): Anthropic.MessageParam[] | undefined {
  return sessions.get(sessionId);
}

export function saveSession(sessionId: string, messages: Anthropic.MessageParam[]): void {
  sessions.set(sessionId, messages);
}
```

#### 第 2 步：定义接口（为将来扩展做准备）

```typescript
// app/session-store/types.ts
export interface SessionStore {
  createSession(): string | Promise<string>;
  getSession(sessionId: string): Anthropic.MessageParam[] | undefined | Promise<Anthropic.MessageParam[] | undefined>;
  saveSession(sessionId: string, messages: Anthropic.MessageParam[]): void | Promise<void>;
}
```

#### 第 3 步：多实现（内存 + Redis）

```typescript
// app/session-store/memory-store.ts
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Anthropic.MessageParam[]>();
  // ... 实现
}

// app/session-store/redis-store.ts
export class RedisSessionStore implements SessionStore {
  private client: RedisClient;
  // ... 实现
}
```

#### 第 4 步：工厂函数切换

```typescript
// app/session-store/index.ts
export function createSessionStore(): SessionStore {
  if (process.env.USE_REDIS === "true") {
    return new RedisSessionStore();
  }
  return new MemorySessionStore();
}
```

---

## API 接口设计

### 设计思路

1. 先想清楚「用户能做什么」（功能需求）
2. 再想清楚「前端需要什么数据」（前端视角）
3. 最后定义「接口路径 + 请求 + 响应」

### 接口列表

| 接口 | 方法 | 用途 |
|---|---|---|
| `/api/session` | POST | 创建新会话 |
| `/api/session/:sessionId` | GET | 获取会话历史 |
| `/api/session/:sessionId/message` | POST | 发送消息 |

### 接口详情

#### 1. 创建会话

```
POST /api/session

请求：无

响应：
{
  "sessionId": "uuid-string"
}
```

#### 2. 发送消息

```
POST /api/session/:sessionId/message

请求：
{
  "message": "用户输入的消息"
}

响应：
{
  "success": true,
  "response": "Agent 的回复",
  "messages": [...]
}
```

#### 3. 获取会话历史

```
GET /api/session/:sessionId

响应：
{
  "messages": [...]
}
```

---

## 启动方式

### Terminal 版本

```bash
bun run s01
```

### Web 版本

```bash
bun web
```

然后打开浏览器访问：`http://localhost:3000`

---

## 总结

### 核心要点

1. **分层架构**：核心层 + 交互层 + 基础设施层
2. **核心不变**：agentLoop 在 Terminal 和 Web 中完全一样
3. **交互层替换**：想换界面，只改交互层
4. **渐进式设计**：先用内存存储，需要时再加持久化
5. **接口先行**：设计 API 时，先想用户要做什么

### 下一步扩展

- 添加用户认证
- 持久化到数据库
- 支持文件上传
- 添加更多交互方式（Discord、Slack、Telegram 等）
