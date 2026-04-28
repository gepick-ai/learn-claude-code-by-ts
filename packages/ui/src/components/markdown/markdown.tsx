import DOMPurify from "dompurify"
import morphdom from "morphdom"
import { clsx } from "clsx"
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../../context/i18n"
import { useMarked } from "../../context/marked"

type Entry = {
  hash: string
  html: string
}

const max = 200
const cache = new Map<string, Entry>()

if (typeof window !== "undefined" && DOMPurify.isSupported) {
  DOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
    if (!(node instanceof HTMLAnchorElement)) return
    if (node.target !== "_blank") return
    const rel = node.getAttribute("rel") ?? ""
    const set = new Set(rel.split(/\s+/).filter(Boolean))
    set.add("noopener")
    set.add("noreferrer")
    node.setAttribute("rel", Array.from(set).join(" "))
  })
}

const config = {
  USE_PROFILES: { html: true, mathMl: true },
  SANITIZE_NAMED_PROPS: true,
  FORBID_TAGS: ["style"],
  FORBID_CONTENTS: ["style", "script"],
}

const iconPaths = {
  copy: '<path d="M6.2513 6.24935V2.91602H17.0846V13.7493H13.7513M13.7513 6.24935V17.0827H2.91797V6.24935H13.7513Z" stroke="currentColor" stroke-linecap="round"/>',
  check: '<path d="M5 11.9657L8.37838 14.7529L15 5.83398" stroke="currentColor" stroke-linecap="square"/>',
}

function sanitize(html: string) {
  if (!DOMPurify.isSupported) return ""
  return DOMPurify.sanitize(html, config)
}

function escape(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fallback(markdown: string) {
  return escape(markdown).replace(/\r\n?/g, "\n").replace(/\n/g, "<br>")
}

export function checksum(content: string): string | undefined {
  if (!content) return undefined
  let hash = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

type CopyLabels = { copy: string; copied: string }

function createIcon(path: string, slot: string) {
  const icon = document.createElement("div")
  icon.setAttribute("data-component", "icon")
  icon.setAttribute("data-size", "small")
  icon.setAttribute("data-slot", slot)
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("data-slot", "icon-svg")
  svg.setAttribute("fill", "none")
  svg.setAttribute("viewBox", "0 0 20 20")
  svg.setAttribute("aria-hidden", "true")
  svg.innerHTML = path
  icon.appendChild(svg)
  return icon
}

function createCopyButton(labels: CopyLabels) {
  const button = document.createElement("button")
  button.type = "button"
  button.setAttribute("data-component", "icon-button")
  button.setAttribute("data-variant", "secondary")
  button.setAttribute("data-size", "small")
  button.setAttribute("data-slot", "markdown-copy-button")
  button.setAttribute("aria-label", labels.copy)
  button.setAttribute("data-tooltip", labels.copy)
  button.appendChild(createIcon(iconPaths.copy, "copy-icon"))
  button.appendChild(createIcon(iconPaths.check, "check-icon"))
  return button
}

function setCopyState(button: HTMLButtonElement, labels: CopyLabels, copied: boolean) {
  if (copied) {
    button.setAttribute("data-copied", "true")
    button.setAttribute("aria-label", labels.copied)
    button.setAttribute("data-tooltip", labels.copied)
    return
  }
  button.removeAttribute("data-copied")
  button.setAttribute("aria-label", labels.copy)
  button.setAttribute("data-tooltip", labels.copy)
}

function ensureCodeWrapper(block: HTMLPreElement, labels: CopyLabels) {
  const parent = block.parentElement
  if (!parent) return
  const wrapped = parent.getAttribute("data-component") === "markdown-code"
  if (!wrapped) {
    const wrapper = document.createElement("div")
    wrapper.setAttribute("data-component", "markdown-code")
    parent.replaceChild(wrapper, block)
    wrapper.appendChild(block)
    wrapper.appendChild(createCopyButton(labels))
    return
  }
  const buttons = Array.from(parent.querySelectorAll('[data-slot="markdown-copy-button"]')).filter(
    (el): el is HTMLButtonElement => el instanceof HTMLButtonElement,
  )
  if (buttons.length === 0) {
    parent.appendChild(createCopyButton(labels))
    return
  }
  for (const button of buttons.slice(1)) button.remove()
}

function decorate(root: HTMLDivElement, labels: CopyLabels) {
  const blocks = Array.from(root.querySelectorAll("pre"))
  for (const block of blocks) ensureCodeWrapper(block, labels)
}

function setupCodeCopy(root: HTMLDivElement, labels: CopyLabels) {
  const timeouts = new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>()
  const updateLabel = (button: HTMLButtonElement) => {
    const copied = button.getAttribute("data-copied") === "true"
    setCopyState(button, labels, copied)
  }
  const handleClick = async (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('[data-slot="markdown-copy-button"]')
    if (!(button instanceof HTMLButtonElement)) return
    const code = button.closest('[data-component="markdown-code"]')?.querySelector("code")
    const content = code?.textContent ?? ""
    if (!content) return
    const clipboard = navigator?.clipboard
    if (!clipboard) return
    await clipboard.writeText(content)
    setCopyState(button, labels, true)
    const existing = timeouts.get(button)
    if (existing) clearTimeout(existing)
    const timeout = setTimeout(() => setCopyState(button, labels, false), 2000)
    timeouts.set(button, timeout)
  }
  decorate(root, labels)
  const buttons = Array.from(root.querySelectorAll('[data-slot="markdown-copy-button"]'))
  for (const button of buttons) if (button instanceof HTMLButtonElement) updateLabel(button)
  root.addEventListener("click", handleClick)
  return () => {
    root.removeEventListener("click", handleClick)
    for (const timeout of timeouts.values()) clearTimeout(timeout)
  }
}

function touch(key: string, value: Entry) {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size <= max) return
  const first = cache.keys().next().value
  if (!first) return
  cache.delete(first)
}

export function Markdown(
  props: ComponentProps<"div"> & { text: string; cacheKey?: string; className?: string; classList?: Record<string, boolean> },
) {
  const { text, cacheKey, className, classList, ...rest } = props
  const marked = useMarked()
  const i18n = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState("")
  const cls = useMemo(() => clsx(className, ...Object.entries(classList ?? {}).filter(([, v]) => v).map(([k]) => k)), [classList, className])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const hash = checksum(text)
      const key = cacheKey ?? hash
      if (key && hash) {
        const cached = cache.get(key)
        if (cached && cached.hash === hash) {
          touch(key, cached)
          if (mounted) setHtml(cached.html)
          return
        }
      }
      const next = await marked.parse(text)
      const safe = sanitize(next)
      if (key && hash) touch(key, { hash, html: safe })
      if (mounted) setHtml(safe)
    }
    run().catch(() => {
      if (mounted) setHtml(fallback(text))
    })
    return () => {
      mounted = false
    }
  }, [cacheKey, marked, text])

  useEffect(() => {
    const container = root.current
    if (!container) return
    if (!html) {
      container.innerHTML = ""
      return
    }
    const labels = { copy: i18n.t("ui.message.copy"), copied: i18n.t("ui.message.copied") }
    const temp = document.createElement("div")
    temp.innerHTML = html
    decorate(temp, labels)
    morphdom(container, temp, {
      childrenOnly: true,
      onBeforeElUpdated: (fromEl, toEl) => !fromEl.isEqualNode(toEl),
    })
    let cleanup: (() => void) | undefined
    const timer = setTimeout(() => {
      cleanup?.()
      cleanup = setupCodeCopy(container, labels)
    }, 150)
    return () => {
      clearTimeout(timer)
      cleanup?.()
    }
  }, [html, i18n])

  return <div data-component="markdown" className={cls} ref={root} {...rest} />
}
