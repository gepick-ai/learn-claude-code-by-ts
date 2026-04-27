# Learn Claude Code By TypeScript

这是一个基于 Bun + TypeScript 改写的 [Learn Claude Code](https://learn.shareai.run/zh/)练习项目。它把 Agent 的核心能力拆成一组可以逐步上手、逐步组合的练习，帮助你从最小循环开始，依次理解工具使用、计划协调、上下文管理、并发执行和多 Agent 协作。

整个项目按能力演进分成 `5` 个大类，共 `12` 个小练习。每个小练习都是一个可以单独运行的最小实现，既方便逐章理解，也方便对照代码实验。

## 技能分类

### 工具执行

训练重点：

- 理解 Agent 的最小工作循环
- 理解模型如何发起工具调用
- 理解工具结果如何回流到上下文

- [x] `s01 Agent 循环`
- [x] `s02 工具`

### 规划与协调

训练重点：

- 让 Agent 显式维护计划
- 学会把复杂任务拆成子任务
- 理解技能按需加载
- 理解短期 Todo 和长期任务系统的区别

- [x] `s03 TodoWrite`
- [x] `s04 子 Agent`
- [x] `s05 技能`
- [x] `s07 任务系统`

### 内存管理

训练重点：

- 理解上下文为什么会膨胀
- 学会在循环关键节点压缩消息
- 区分活跃上下文、摘要和归档 transcript

- [x] `s06 上下文压缩`

### 并发

训练重点：

- 理解慢操作为什么不该阻塞主循环
- 学会把长耗时工作放到后台
- 理解“并行等待”而不是“并行推理”

- [x] `s08 后台任务`

### 协作

训练重点：

- 理解多 Agent 团队如何分工
- 学会建立协作协议和消息规范
- 理解自主认领任务与任务隔离
- 理解 worktree 在多 Agent 开发中的作用

- [x] `s09 Agent 团队`
- [ ] `s10 团队协议`
- [ ] `s11 自主 Agent`
- [ ] `s12 Worktree + 任务隔离`

## 运行方式

安装依赖：

```bash
bun install
```

启动某个练习（在`package.json`可以看到）：

```bash
# 比如启动s01来理解Agent的最小工作循环
bun s01
```

运行前请先配置 `.env`。

```bash
cp .env-example .env
```

然后按需在 `.env` 中填写你自己的配置：

填写Anthropic兼容的 `MODEL_ID`、`ANTHROPIC_BASE_URL`、`ANTHROPIC_API_KEY`。
