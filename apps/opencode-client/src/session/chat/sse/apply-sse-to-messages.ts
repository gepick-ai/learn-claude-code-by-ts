import type { Part, SessionMessage } from "@agent-dev/opencode-sdk"

const OPT = "client-optimistic-user:"

function stripOptimisticWhenRealUserExists(list: SessionMessage[]): SessionMessage[] {
  const realUserTexts = new Set(
    list
      .filter((m) => m.message.role === "user" && !m.message.id.startsWith(OPT))
      .map((m) => {
        const tp = m.parts.find((p) => p.type === "text")
        return tp?.type === "text" ? tp.text : ""
      })
      .filter(Boolean),
  )
  return list.filter((m) => {
    if (!m.message.id.startsWith(OPT)) return true
    const tp = m.parts.find((p) => p.type === "text")
    const t = tp?.type === "text" ? tp.text : ""
    return !realUserTexts.has(t)
  })
}

/**
 * 同一 part 上 `part.updated` 可能在 delta 已拼出较长串之后才到（或乱序），若仍 `{ ...p, ...part }` 会用**更短**的 `text` 盖掉，表现为流在收尾处**截断**。
 * 对 text / reasoning 采用「取更长者」的合并策略，避免前端状态被过期的快照回卷。
 */
function mergePartById(msg: SessionMessage, part: Part): SessionMessage {
  const i = msg.parts.findIndex((p) => p.id === part.id)
  if (i === -1) {
    return { ...msg, parts: [...msg.parts, part] }
  }
  const old = msg.parts[i]!
  let next: Part
  if (old.type === "text" && part.type === "text") {
    const text = old.text.length > part.text.length ? old.text : part.text
    next = { ...part, text }
  } else if (old.type === "reasoning" && part.type === "reasoning") {
    const text = old.text.length > part.text.length ? old.text : part.text
    next = { ...part, text }
  } else {
    next = { ...old, ...part } as Part
  }
  const nextParts = msg.parts.map((p, j) => (j === i ? next : p))
  return { ...msg, parts: nextParts }
}

/**
 * 合并 `session.part.updated`：按 messageId 找到或新建一条 SessionMessage，再按 part.id 去重/覆盖。
 * 不处理与「本回合首条 user 消息 id」同 id 的更新（在 store 中先被跳过）。
 */
export function mergePartUpdated(list: SessionMessage[], part: Part): SessionMessage[] {
  const mi = list.findIndex((m) => m.message.id === part.messageId)
  if (mi === -1) {
    const sm: SessionMessage = {
      message: {
        id: part.messageId,
        sessionId: part.sessionId,
        createdAt: Date.now(),
        role: "assistant",
      },
      parts: [part],
    }
    return stripOptimisticWhenRealUserExists([...list, sm])
  }
  const next = [...list]
  next[mi] = mergePartById(list[mi]!, part)
  return stripOptimisticWhenRealUserExists(next)
}

type DeltaProps = {
  sessionId: string
  messageId: string
  partId: string
  field: string
  delta: string
}

function appendToTextPart(part: Part, delta: string, field: string): Part | null {
  if (field !== "text") return null
  if (part.type === "text") {
    return { ...part, text: part.text + delta }
  }
  if (part.type === "reasoning") {
    return { ...part, text: part.text + delta }
  }
  return null
}

/** 合并 `session.part.delta`：在已有 part 上拼接文本，或首包创建 text part。 */
export function mergePartDelta(list: SessionMessage[], p: DeltaProps): SessionMessage[] {
  if (p.field !== "text") return list

  const mi = list.findIndex((m) => m.message.id === p.messageId)
  if (mi === -1) {
    const newPart: Part = {
      id: p.partId,
      sessionId: p.sessionId,
      messageId: p.messageId,
      type: "text",
      text: p.delta,
    }
    const sm: SessionMessage = {
      message: {
        id: p.messageId,
        sessionId: p.sessionId,
        createdAt: Date.now(),
        role: "assistant",
      },
      parts: [newPart],
    }
    return stripOptimisticWhenRealUserExists([...list, sm])
  }

  const m = list[mi]!
  const pi = m.parts.findIndex((x) => x.id === p.partId)
  if (pi === -1) {
    const newPart: Part = {
      id: p.partId,
      sessionId: p.sessionId,
      messageId: p.messageId,
      type: "text",
      text: p.delta,
    }
    const updated: SessionMessage = { ...m, parts: [...m.parts, newPart] }
    const next = list.map((x, i) => (i === mi ? updated : x))
    return stripOptimisticWhenRealUserExists(next)
  }

  const part = m.parts[pi]!
  const merged = appendToTextPart(part, p.delta, p.field)
  if (!merged) return list
  const nextParts = m.parts.map((x, j) => (j === pi ? merged : x))
  const next = list.map((x, i) => (i === mi ? { ...m, parts: nextParts } : x))
  return stripOptimisticWhenRealUserExists(next)
}
