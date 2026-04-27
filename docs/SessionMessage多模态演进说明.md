# `POST /api/session/:sessionId/message` 多模态演进说明

本文围绕 `app/server/session/controller.ts` 里的这段接口展开：

```20:38:app/server/session/controller.ts
sessionController.post("/:sessionId/message", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const { message } = await c.req.json();
    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    const result = await sessionService.chatWithSession(sessionId, message);
    return c.json({
      success: true,
      response: result.response,
      messages: result.messages,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
```

## 这段代码在初始版本为什么成立

在初始版本里，我们把一次用户输入理解成一段纯文本。

例如：

```json
{
  "message": "帮我总结一下这段代码"
}
```

此时接口设计很直接：

- 路由表达的是“向某个 session 发送一条 message”
- 请求体只需要一个 `message: string`
- service 层也只需要把这段文本喂给 agent

这个版本很适合教学、原型验证和最早期的文本对话场景。

## 为什么演进到多模态后，这个输入模型就不够了

一旦系统支持多模态，一次输入就不再只是纯文本，而可能是：

- 文本
- 文件
- 图片
- 语音转写结果
- 文本 + 文件的组合

也就是说，用户真正表达的已经不是：

```json
{
  "message": "帮我看下这份文件"
}
```

而更像：

```json
{
  "parts": [
    { "type": "text", "text": "帮我看下这份文件" },
    { "type": "file", "fileId": "file_123" }
  ]
}
```

这里的关键变化是：

- “帮我看下这份文件” 这句话本身并不完整
- 真正让模型可以工作的，是“文本意图 + 文件对象”一起组成的输入
- 因此接口不能再把一次 message 简化为单个字符串

## 这会带来哪些设计变化

### 1. Controller 层

原来只解析：

```ts
const { message } = await c.req.json();
```

后面更可能需要解析：

```ts
const { parts } = await c.req.json();
```

或者：

```ts
const { content } = await c.req.json();
```

也就是说，Controller 不再只是做“取一个字符串”，而是要接收一组结构化输入片段。

### 2. Service 层

原来 service 可以直接认为输入就是文本：

- 取出 `message`
- 调 `agentLoop(message, messages)`

但多模态后，service 需要考虑：

- 文本 part 如何进入模型
- 文件 part 如何映射成模型可识别的数据结构
- 是否要在入库前补充附件元数据
- 是否要把 message 存成多 part 结构，而不是单个字符串

### 3. 数据模型

原来可以粗暴地认为：

- 一条 message = 一段字符串

但多模态后更合理的心智应该是：

- 一条 message = 一次交互单元
- message 内部包含多个 part
- text 只是 part 的一种

例如：

```json
{
  "role": "user",
  "parts": [
    { "type": "text", "text": "帮我看下这份文件" },
    { "type": "file", "fileId": "file_123" }
  ]
}
```

## 为什么路由本身通常不用变

这里有一个容易混淆的点：

- **变的主要是请求体结构**
- **不一定是路由路径**

也就是说，`POST /api/session/:sessionId/message` 这个路由本身通常仍然合理，因为它表达的依然是：

- 在某个 session 下发送一条消息

真正需要升级的是这条消息的载荷结构。

所以更准确的理解是：

- 初版：`message` 的内容是 `string`
- 演进版：`message` 的内容是 `parts[]`

## 推荐的演进方向

如果未来要支持多模态，建议逐步把请求体从：

```json
{
  "message": "帮我看下这份文件"
}
```

升级为：

```json
{
  "parts": [
    { "type": "text", "text": "帮我看下这份文件" },
    { "type": "file", "fileId": "file_123" }
  ]
}
```

这样做的好处是：

- 对纯文本兼容：纯文本也可以只是一个 text part
- 对多模态自然扩展：后续加 image/file/audio 不需要推翻接口
- 对存储和 SSE 更友好：后续 message、message parts 都更容易演进

## 一句话总结

`POST /api/session/:sessionId/message` 这个接口在初始文本版里可以把输入设计成 `message: string`，但一旦进入多模态阶段，一次 message 的真实含义就变成了“由多个 part 组成的一次输入”，因此不能再把它仅仅看成一句文本，而应该升级成结构化输入。
