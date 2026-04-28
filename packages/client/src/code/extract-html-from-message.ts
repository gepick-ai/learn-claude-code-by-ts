export type ExtractHtmlResult =
  | { status: "ready"; html: string }
  | { status: "incomplete" }
  | { status: "invalid"; error: string }

function normalizeCandidate(raw: string): string {
  return raw.trim()
}

function looksLikeHtmlDocument(raw: string): boolean {
  const text = raw.toLowerCase()
  return text.includes("<html") || text.includes("<!doctype html")
}

function isCompleteHtmlDocument(raw: string): boolean {
  const text = raw.toLowerCase()
  const htmlOpen = text.indexOf("<html")
  const htmlClose = text.lastIndexOf("</html>")
  if (htmlOpen === -1 && !text.includes("<!doctype html")) return false
  if (htmlClose === -1) return false
  if (htmlOpen !== -1 && htmlClose < htmlOpen) return false
  return true
}

function pickFirstMarkdownHtmlCodeBlock(messageText: string): string | null {
  const re = /```(?:html)?\s*([\s\S]*?)```/gi
  let matched: RegExpExecArray | null = re.exec(messageText)
  while (matched) {
    const candidate = normalizeCandidate(matched[1] ?? "")
    if (candidate && looksLikeHtmlDocument(candidate)) return candidate
    matched = re.exec(messageText)
  }
  return null
}

function pickFirstHtmlFromPlainText(messageText: string): string | null {
  const lower = messageText.toLowerCase()
  const htmlStart = lower.indexOf("<html")
  const doctypeStart = lower.indexOf("<!doctype html")
  const start = htmlStart === -1 ? doctypeStart : doctypeStart === -1 ? htmlStart : Math.min(htmlStart, doctypeStart)
  if (start === -1) return null
  const endTag = "</html>"
  const end = lower.indexOf(endTag, start)
  if (end === -1) return normalizeCandidate(messageText.slice(start))
  return normalizeCandidate(messageText.slice(start, end + endTag.length))
}

export function extractHtmlFromMessage(messageText: string): ExtractHtmlResult {
  const text = messageText.trim()
  if (!text) return { status: "incomplete" }

  const markdownCandidate = pickFirstMarkdownHtmlCodeBlock(text)
  if (markdownCandidate) {
    if (isCompleteHtmlDocument(markdownCandidate)) return { status: "ready", html: markdownCandidate }
    return { status: "incomplete" }
  }

  const plainCandidate = pickFirstHtmlFromPlainText(text)
  if (plainCandidate) {
    if (isCompleteHtmlDocument(plainCandidate)) return { status: "ready", html: plainCandidate }
    return { status: "incomplete" }
  }

  return { status: "invalid", error: "未找到可执行的完整 HTML 文档" }
}
