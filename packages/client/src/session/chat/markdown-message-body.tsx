import type { Components } from "react-markdown"
import Markdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import { cn } from "@/util/cn"

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-2 border-l-2 border-slate-300 pl-3 text-slate-600" {...props}>
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.startsWith("language-"))
    if (isBlock) {
      return (
        <code
          className={cn(
            "block min-w-0 max-w-full whitespace-pre-wrap wrap-break-word font-mono text-[13px] leading-normal text-slate-800",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800"
        {...props}
      >
        {children}
      </code>
    )
  },
  del: ({ children, ...props }) => (
    <del className="text-slate-500" {...props}>
      {children}
    </del>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold text-slate-900 first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mb-2 mt-3 text-sm font-semibold text-slate-900 first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-1.5 mt-2 text-sm font-semibold text-slate-800 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="mb-1.5 mt-2 text-sm font-medium text-slate-800 first:mt-0" {...props}>
      {children}
    </h4>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  img: ({ alt, ...props }) => (
    <img alt={alt ?? ""} className="my-2 max-h-64 max-w-full rounded-md border border-slate-200 object-contain" {...props} />
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-slate-500" {...props}>
      {children}
    </ol>
  ),
  p: ({ children, ...props }) => (
    <p className="my-2 first:mt-0 last:mb-0 [&+p]:mt-2" {...props}>
      {children}
    </p>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-2 min-w-0 max-w-full overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-normal"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse border border-slate-200 text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => <thead className="bg-slate-50" {...props}>{children}</thead>,
  tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  th: ({ children, ...props }) => (
    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-800" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-slate-200 px-2 py-1.5 text-slate-700" {...props}>
      {children}
    </td>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 marker:text-slate-500" {...props}>
      {children}
    </ul>
  ),
}

export type MarkdownMessageBodyProps = {
  content: string
  variant?: "default" | "reasoning"
}

export function MarkdownMessageBody({ content, variant = "default" }: MarkdownMessageBodyProps) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full wrap-break-word text-sm leading-relaxed [word-break:break-word]",
        variant === "reasoning" && "border-l-2 border-slate-300 pl-3 italic text-slate-600",
        variant === "default" && "text-slate-800",
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </Markdown>
    </div>
  )
}
