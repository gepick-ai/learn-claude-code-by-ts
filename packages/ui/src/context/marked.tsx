import { marked } from "marked"
import hljs from "highlight.js/lib/core"
import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdown from "highlight.js/lib/languages/markdown"
import plaintext from "highlight.js/lib/languages/plaintext"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import { createContext, useContext, type ReactNode } from "react"

export type MarkedParser = {
  parse: (markdown: string) => Promise<string>
}

hljs.registerLanguage("bash", bash)
hljs.registerLanguage("sh", bash)
hljs.registerLanguage("zsh", bash)
hljs.registerLanguage("shell", bash)
hljs.registerLanguage("css", css)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("js", javascript)
hljs.registerLanguage("json", json)
hljs.registerLanguage("markdown", markdown)
hljs.registerLanguage("md", markdown)
hljs.registerLanguage("plaintext", plaintext)
hljs.registerLanguage("text", plaintext)
hljs.registerLanguage("sql", sql)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("ts", typescript)
hljs.registerLanguage("html", xml)
hljs.registerLanguage("xml", xml)

function escape(html: string) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function code(text: string, lang?: string) {
  const id = (lang ?? "").trim().toLowerCase()
  const valid = id && hljs.getLanguage(id)
  if (valid) {
    const value = hljs.highlight(text, { language: id }).value
    return `<pre><code class="hljs language-${id}">${value}</code></pre>`
  }
  const value = hljs.highlightAuto(text).value
  return `<pre><code class="hljs language-text">${value || escape(text)}</code></pre>`
}

const fallback: MarkedParser = {
  parse: async (markdown) => {
    marked.use({
      gfm: true,
      breaks: false,
      renderer: {
        link({ href, title, text }) {
          const attr = title ? ` title="${title}"` : ""
          return `<a href="${href}"${attr} class="external-link" target="_blank" rel="noopener noreferrer">${text}</a>`
        },
        code(token) {
          return code(token.text, token.lang)
        },
      },
    })
    return (await marked.parse(markdown)) as string
  },
}

const Context = createContext<MarkedParser>(fallback)

export function MarkedProvider(props: { value?: MarkedParser; children?: ReactNode }) {
  return <Context.Provider value={props.value ?? fallback}>{props.children}</Context.Provider>
}

export function useMarked() {
  return useContext(Context)
}
