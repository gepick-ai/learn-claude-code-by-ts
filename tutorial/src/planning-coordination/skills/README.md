# s05 技能

本文基于 Learn Claude Code 的 `s05` 章节整理，沿用 `s01`、`s02`、`s03`、`s04` 的写法风格，结合 Bun + TypeScript 场景改写，重点讲清楚为什么“知识要按需加载”，以及技能系统在 Agent 里到底扮演什么角色。

参考原文：[Learn Claude Code - s05 技能](https://learn.shareai.run/zh/s05/)

## 一句话理解

`s05` 的核心是：

`模型先知道有哪些技能，需要时再加载具体技能内容`

也可以记成：

`技能摘要常驻，技能正文按需注入`

这就是这一章最关键的设计。

## 为什么需要技能系统

前面几章，你已经让 Agent 拥有了这些能力：

- `s01`：能循环执行
- `s02`：能扩展工具
- `s03`：能维护计划
- `s04`：能用子 Agent 隔离子任务

但还有一个问题没有解决：

`Agent 怎么遵循某个领域的工作方法，而又不把所有知识都塞进系统提示里？`

比如你可能希望 Agent 在不同场景下遵循不同规范：

- 提交代码时遵循 git 约定
- 写测试时遵循测试规范
- 做 code review 时遵循检查清单
- 搭建某类项目时遵循固定步骤

如果把这些规则一次性全塞进 system prompt，会有几个问题：

- token 浪费非常大
- 大量内容和当前任务无关
- 系统提示过长会稀释真正重要的上下文
- 模型不一定每次都需要那些知识

所以 `s05` 的答案不是“把知识写更多”，而是：

`把知识做成可加载的技能`

## `s05` 真正解决的核心问题

这一章最本质的变化不是“多了几个技能文件”，而是：

`把大块领域知识从 always-on 提示，变成 on-demand 注入`

也就是从：

- 一开始就全部告诉模型

变成：

- 先只告诉模型“有哪些能力可以用”
- 当它真的需要某项知识时，再把完整内容加载进来

这是一种非常典型的上下文预算优化思路。

## 两层注入设计

这是 `s05` 最该记住的东西。

### 第一层：轻量摘要，常驻 system prompt

系统提示里只保留每个技能的：

- 名称
- 简短描述

例如：

```txt
Available skills:
- git: Git workflow helpers
- test: Testing best practices
- review: Code review checklist
```

这一层很便宜，主要作用是让模型“知道技能存在”。

### 第二层：完整内容，按需通过工具结果注入

当模型决定加载某个技能时，比如调用：

`load_skill("git")`

工具就返回该技能完整正文：

```txt
<skill name="git">
完整 git 工作流说明...
</skill>
```

这一层才是昂贵的正文内容，但只有在需要时才出现。

## 为什么两层注入比全塞 system prompt 更好

因为它把“技能发现”和“技能使用”分开了。

模型不需要一开始就读完所有细节，只需要先知道：

- 有哪些技能
- 每个技能大概做什么

等到某个任务真的需要时，再去拉正文。

这样会带来几个直接好处：

- 减少上下文浪费
- 提高 system prompt 的信息密度
- 降低无关知识干扰
- 更适合技能越来越多的系统

## 技能本质上是什么

从工程角度看，技能不是模型参数，也不是隐藏魔法。

技能本质上就是：

- 一份结构化文档
- 一种可按需加载的知识块
- 一段指导模型如何工作的操作说明

你可以把它理解成：

- 写给 Agent 的 mini playbook
- 一个领域工作流模板
- 一份临时加载的专家手册

## 技能和工具的区别

这点很容易混。

### 工具

工具负责“做事”：

- 读文件
- 写文件
- 跑命令
- 开子任务

### 技能

技能负责“指导怎么做事”：

- git 提交怎么组织
- review 时优先关注哪些风险
- 测试时先补什么类型的覆盖

所以可以把它们记成：

- `tools = actions`
- `skills = instructions`

## TypeScript 里怎么理解技能目录

`s05` 的思路通常是：每个技能一个目录，里面有一个 `SKILL.md`。

例如：

```txt
skills/
  git/
    SKILL.md
  test/
    SKILL.md
  review/
    SKILL.md
```

每个 `SKILL.md` 一般包含两部分：

1. frontmatter
   存元信息，比如名称和描述
2. 正文
   存完整技能说明

## 一个技能文件大概长什么样

```md
---
name: git
description: Git workflow helpers
---

When creating commits:
1. Check git status
2. Review staged changes
3. Follow commit message conventions
```

这样系统就可以：

- 用 `name` 和 `description` 生成摘要列表
- 在需要时返回正文内容

## SkillLoader 是什么

你可以把 `SkillLoader` 理解成一个小型知识索引器。

它主要做 3 件事：

1. 扫描所有 `SKILL.md`
2. 解析元信息和正文
3. 提供两个接口

这两个接口通常就是：

- `getDescriptions()`
- `getContent(name)`

## 一个最小的 TypeScript SkillLoader

```ts
type SkillMeta = {
  name: string;
  description?: string;
};

type SkillRecord = {
  meta: SkillMeta;
  body: string;
};
```

继续往下，你可以做一个最小类：

```ts
class SkillLoader {
  private skills = new Map<string, SkillRecord>();

  register(name: string, description: string, body: string) {
    this.skills.set(name, {
      meta: { name, description },
      body,
    });
  }

  getDescriptions() {
    return [...this.skills.values()]
      .map((skill) => `- ${skill.meta.name}: ${skill.meta.description ?? ""}`)
      .join("\n");
  }

  getContent(name: string) {
    const skill = this.skills.get(name);

    if (!skill) {
      return `Error: Unknown skill "${name}".`;
    }

    return `<skill name="${skill.meta.name}">\n${skill.body}\n</skill>`;
  }
}
```

这个版本是最小心智模型。  
真实项目里你通常会从文件系统扫描并解析 frontmatter，但概念上就是这么回事。

## 如果从文件系统加载技能

在 Bun + TypeScript 场景里，一个更接近实际的做法会是：

```ts
import path from "node:path";

async function loadSkillFile(filePath: string) {
  const text = await Bun.file(filePath).text();
  return text;
}
```

然后：

- 找到所有 `SKILL.md`
- 解析 frontmatter
- 用目录名或 frontmatter 里的 `name` 作为技能标识
- 把正文存进 `SkillLoader`

## `getDescriptions()` 为什么重要

因为它负责构造第一层注入，也就是“技能摘要常驻层”。

例如：

```ts
const SYSTEM = `
You are a coding agent.
Available skills:
${skillLoader.getDescriptions()}
`;
```

这一步让模型始终知道有哪些技能存在，但不会被完整技能正文淹没。

## `getContent(name)` 为什么重要

因为它负责构造第二层注入，也就是“正文按需加载层”。

当模型调用：

`load_skill({ name: "git" })`

你就返回：

```txt
<skill name="git">
...完整技能内容...
</skill>
```

这会作为普通 `tool_result` 注入到消息流里。

注意这一点特别关键：

`技能正文不是写进 system prompt，而是通过 tool_result 注入`

这正是 `s05` 的设计亮点。

## 为什么通过 `tool_result` 注入更合理

因为这样技能就变成了：

- 一种按需读取的外部知识
- 和其他工具调用一样可追踪
- 可以明确知道“什么时候加载了哪项技能”

同时还有一个非常现实的好处：

`你不会在每次请求里都反复携带完整技能正文`

这对上下文控制非常重要。

## 把 `load_skill` 接进 dispatch map

从工程结构看，`load_skill` 其实也只是又一个工具：

```ts
const toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: runTodo,
  task: runTask,
  load_skill: async (input) => {
    const name = String(input.name ?? "");
    return skillLoader.getContent(name);
  },
};
```

这说明一件事：

`技能系统并没有推翻之前架构，它只是继续复用工具调用机制`

也就是说：

- `s01` 的循环还在
- `s02` 的 dispatch map 还在
- `s03` 的计划机制还可以继续用
- `s04` 的子 Agent 同样也能加载技能

技能系统是叠加上去的，不是替换掉之前的东西。

## 技能系统和子 Agent 的关系

这点很值得你注意。

一旦你有了子 Agent，那么技能就不一定只给父 Agent 用。  
很多时候，子 Agent 更需要技能，因为它负责处理具体领域任务。

比如：

- 父 Agent 决定“去做 code review”
- 子 Agent 真正执行 review
- 子 Agent 先加载 `review` 技能
- 然后按技能说明去检查代码

这就形成了：

- 父层负责调度
- 子层按需加载领域知识

这个组合非常强。

## 技能系统真正带来的好处

如果你站在工程维护角度看，技能系统的价值不仅是省 token。

它还带来了这些能力：

- 知识模块化
- 规则可独立维护
- 不同任务可加载不同技能
- 经验可以被沉淀成可复用资产

换句话说，技能让“提示词”开始从一次性文本，变成结构化的系统资源。

## 一个常见误解

很多人会以为技能就是“更长的 system prompt”。

其实不是。

更准确地说：

- system prompt 负责定义 Agent 的基本人格和总原则
- 技能负责在特定任务下补充局部专业知识

所以技能不该替代 system prompt，而应该补充它。

## 什么时候适合做成技能

如果一段知识满足下面这些特征，就很适合做成技能：

- 会被重复使用
- 只在特定任务下才需要
- 内容比较长
- 有明确步骤或检查清单
- 未来可能独立维护或扩展

典型例子包括：

- git 提交流程
- code review 清单
- 测试补充策略
- 发布部署流程
- 某类项目的搭建模板

## 不适合做成技能的内容

如果一段信息是下面这种，就不一定适合：

- 每次都必须遵守的最基础规则
- 很短的一句全局约束
- 不是工作流，只是一个临时事实

这些通常还是应该留在：

- system prompt
- 普通工具逻辑
- 当前任务上下文

## 一个接近完整的最小结构

```ts
type ToolInput = Record<string, unknown>;

type ToolHandler = (input: ToolInput) => Promise<string>;

class SkillLoader {
  private skills = new Map<string, { description: string; body: string }>();

  register(name: string, description: string, body: string) {
    this.skills.set(name, { description, body });
  }

  getDescriptions() {
    return [...this.skills.entries()]
      .map(([name, skill]) => `- ${name}: ${skill.description}`)
      .join("\n");
  }

  getContent(name: string) {
    const skill = this.skills.get(name);

    if (!skill) {
      return `Error: Unknown skill "${name}".`;
    }

    return `<skill name="${name}">\n${skill.body}\n</skill>`;
  }
}

const skillLoader = new SkillLoader();

const SYSTEM = `
You are a coding agent.
Available skills:
${skillLoader.getDescriptions()}
`;

const toolHandlers: Record<string, ToolHandler> = {
  bash: runBash,
  read_file: runReadFile,
  write_file: runWriteFile,
  edit_file: runEditFile,
  todo: runTodo,
  task: runTask,
  load_skill: async (input) => {
    const name = String(input.name ?? "");
    return skillLoader.getContent(name);
  },
};
```

这就是 `s05` 最核心的工程骨架。

## 从 TypeScript 角度该抓住什么

如果你是用 TypeScript 自己实现一个最小 Agent，这一章最该抓住的是这几个点：

- 技能是数据，不是硬编码提示词
- 技能描述和技能正文要分层
- `load_skill` 只是一个普通工具
- 技能正文应通过 `tool_result` 注入
- 技能系统要尽量独立于主循环

## 这一章最值得学的工程观念

`s05` 最重要的不是“会不会写 SkillLoader”，而是下面这些工程心法：

- 大块知识不要默认常驻
- 能按需加载的知识就不要长期占上下文
- 规则和经验应该被模块化沉淀
- 知识加载应该可追踪、可组合、可维护

## 对 Bun + TypeScript 初学实现的建议

如果你要在自己的项目里做最小版，建议按这 3 步走：

1. 先手动注册 2 到 3 个技能到 `SkillLoader`
2. 把技能摘要拼进 `SYSTEM`
3. 增加 `load_skill` 工具，让模型按需拿正文

等这条链路打通后，再去做：

- 扫描 `skills/` 目录
- frontmatter 解析
- 更复杂的技能继承或分组

## 推荐练习

你可以尝试让自己的最小 Agent 处理这些任务：

1. `What skills are available?`
2. `Load the git skill and follow it to prepare a commit`
3. `Load the review skill before reviewing the changed files`
4. `Use a subagent and let it load the test skill first`

练习时重点观察一件事：

`如果把所有技能正文都塞进 system prompt，会不会很浪费；换成按需加载后，主上下文是否更清爽`

## 结论

`s05` 想让你建立的核心意识是：

Agent 不应该总是背着全部知识前进。  
它应该先知道“有什么知识可用”，再在合适的时候加载真正需要的那一块。

换成一句最容易记的话就是：

`Keep the catalog always on, load the manual only when needed.`
