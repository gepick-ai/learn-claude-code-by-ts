---
name: bugfix-rca-record
description: >-
  Writes @gepick/client (or user-specified package) bugfix RCA markdown docs:
  filename `<slug>.md` (kebab-case, no date prefix), sections 现象 through 变更文件, Chinese prose.
  Use when the user asks to record, archive, document, or write up a bugfix/RCA,
  or to add a bugfix note matching the existing bugfix docs convention.
---

# Bugfix / RCA 文档归档

当用户要求 **bugfix 记录、归档、RCA、复盘文档** 或与「和现有 bugfix 文档同样格式」的说明时，按本规范新建 Markdown 文件。

## 存放位置

- **默认**：`packages/client/docs/bugfix/`
- 若用户指定其他应用或目录（例如 monorepo 内别的 `apps/*`），使用其下的 `docs/bugfix/`，没有则按用户给定路径创建。

## 文件命名

```
<short-kebab-case-slug>.md
```

- **不要**在文件名中使用 `YYYY-MM-DD-` 或其它日期前缀；日期若需记录，写在正文元信息表或现象描述中即可。
- **slug**：英文小写、连字符分隔，简短描述问题（3～8 个词为宜），与标题含义一致。  
  **示例**：`assistant-toolcall-json-display.md`、`strict-mode-duplicate-session-message-requests.md`
- 仓库中若已有带日期前缀的历史文件，**不要**仅为统一命名而批量重命名；新建文档一律采用 **纯 slug** 文件名。

## 文档结构（必须按序包含下列区块）

1. **标题**：`# RCA：<中文简短标题>`（可含反引号包 API/路径）。
2. **元信息表**（Markdown 表格）：

   | 字段 | 内容 |
   |------|------|
   | **类型** | Bug / Regression / …（可加括号说明环境，如「开发环境」） |
   | **严重度** | Low / Medium / High + 简短理由 |
   | **影响面** | 模块、页面或用户范围 |
   | **状态** | Fixed / Mitigated / Wontfix / … |

3. **`---` 分隔**
4. **## 1. 现象（Symptoms）** — 可复现步骤、表现、与预期的差异；可提开发/生产差异。
5. **## 2. 根因分析（Root Cause Analysis）** — 含 **2.1 直接原因**、必要时 **2.2 关联概念**（术语、官方文档链接）。
6. **## 3. 解决思路（Resolution Strategy）** — 目标一句话；**方案对比表**（方案名 | 说明），标出已采用项。
7. **## 4. 实施方案（Fix）** — 具体改动点（文件、关键逻辑、API），足够让读者不看 diff 也能理解。
8. **## 5. 验证（Verification）** — 如何确认修复（手动步骤、命令如 `tsc`、测试）。
9. **## 6. 参考（References）** — 仓库内相关文件、外部文档。
10. **## 7. 变更文件（Changelog）** — 表格：文件路径 | 说明。
11. **页脚**（固定格式）：

```markdown
---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
```

页脚中的「存放路径」写 **相对该应用根目录** 的 `docs/bugfix/`（勿写绝对路径）。

## 写作要求

- 正文主体使用 **中文**，技术名词、符号、路径、API 可保留英文。
- 路径与仓库一致时优先写 **`apps/<pkg>/...`** 或相对该包的 `src/...`（与现有 bugfix 一致）。
- 基于当前对话或用户提供的 facts 撰写；不确定处标注「待确认」或向用户追问，勿编造修复内容。
- **不要**在用户未要求时批量重命名已有 bugfix 文件；新文档文件名 **不含日期前缀**（见上文「文件命名」）。

## 输出动作

1. 在选定目录下 **创建** 上述命名的 `.md` 文件（若已存在同名 slug，可改为更精确的 slug 或询问用户）。
2. 向用户简短说明文件路径与标题。
