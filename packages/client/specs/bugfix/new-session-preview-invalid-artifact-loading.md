# RCA：新建会话时 Code 区显示“预览产物无效”文案

| 字段 | 内容 |
|------|------|
| **类型** | Bug（前端预览状态映射与展示体验） |
| **严重度** | Medium（核心路径可用但首屏体验差，易让用户误判系统异常） |
| **影响面** | `@gepick/client` 会话创建后的 Code 区首屏展示 |
| **状态** | Fixed |

---

## 1. 现象（Symptoms）

在新建会话后，Code 区会直接展示“预览产物无效”的整页文案（包含 `npm install` / `npm run build` 提示），而不是更自然的过渡态。

用户体感是“刚建会话就报错”，与预期的“正在准备预览”不一致。

---

## 2. 根因分析（Root Cause Analysis）

### 2.1 直接原因

- 前端 `fetchWorkspacePreviewHtml()` 只要拿到字符串响应就按 `ok` 处理。
- 后端预览网关在检测到占位构建产物时，会返回一段“预览产物无效”HTML（HTTP 仍可为成功响应）。
- `code-store` 因 `disk.ok === true` 把状态置为 `ready`，`CodePanel` 进入 iframe 渲染分支，最终把该文案原样展示给用户。

### 2.2 关联概念

- “返回可读 HTML”不等于“返回可用业务预览”；占位页需要在 client 侧继续语义归类。
- 新会话在 `messageCount === 0` 阶段属于“初始化过程”，更适合映射到 loading，而非 empty/error。

---

## 3. 解决思路（Resolution Strategy）

目标：将“占位构建页”识别为“预览尚未就绪”，在新会话首屏显示 Loading，避免直接暴露技术性无效文案。

| 方案 | 说明 |
|------|------|
| **A. client 侧识别占位 HTML 并映射 loading（已采用）** | 在预览读取层识别占位特征，返回 `missing`；在状态层根据 `messageCount` 映射 `loading`。 |
| B. 仅修改后端兜底文案 | 能缓解措辞，但无法解决前端错误状态映射问题，未采用。 |
| C. UI 层硬编码过滤文本 | 只掩盖表现，链路语义仍错误，未采用。 |

---

## 4. 实施方案（Fix）

1. 修改 `src/code/workspace-preview.ts`：
   - 新增 `isPlaceholderBuildHtml(html)`；
   - 命中占位特征时将结果归类为 `kind: "missing"`，避免误入 `ok/ready` 链路。

2. 修改 `src/code/code-store.ts`：
   - 扩展 `CodePanelStatus`，新增 `"loading"`；
   - 在 `disk.kind === "missing"` 时按 `messages.length === 0` 映射为 `loading`，否则保持 `empty`。

3. 修改 `src/code/code-panel.tsx`：
   - 新增 `loading` 展示分支，使用“正在准备预览...”与简洁旋转指示；
   - 保持已有 `empty`/`ready`/`error` 分支不变。

---

## 5. 验证（Verification）

- 手动验证：
  1) 新建会话并进入 Code 区；  
  2) 观察首屏不再出现“预览产物无效”整页文案；  
  3) 显示“正在准备预览...”加载态；  
  4) 后续有可用产物时可进入正常预览。
- 调试日志验证（本次会话）：
  - 修复前确认链路：占位 HTML 被判定后仍进入 `ready`；
  - 修复后确认状态映射：`missing + messageCount=0` 进入 `loading`。
- 静态检查：相关文件 lint 通过。

---

## 6. 参考（References）

- `src/code/workspace-preview.ts`
- `src/code/code-store.ts`
- `src/code/code-panel.tsx`
- `../bugfix/code-preview-object-object-after-create-session.md`

---

## 7. 变更文件（Changelog）

| 文件 | 说明 |
|------|------|
| `src/code/workspace-preview.ts` | 新增占位构建页识别并归类为 `missing` |
| `src/code/code-store.ts` | 新增 `loading` 状态并在新会话缺产物时映射到 loading |
| `src/code/code-panel.tsx` | 新增 Loading UI，替代“预览产物无效”首屏体验 |

---

*文档类型：RCA（Root Cause Analysis）*  
*存放路径：`docs/bugfix/`*
