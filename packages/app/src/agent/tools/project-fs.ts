import path from "node:path"
import { mkdir } from "node:fs/promises"
import { fn } from "../tool-fs/schema-fn"
import { z } from "zod"
import { resolveInsideProjectRoot } from "./project-path"

async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
}

export function createProjectReadFile(absoluteProjectDir: string) {
  const ReadFileInputSchema = z.object({
    path: z.string(),
    limit: z.number().int().optional(),
  })
  return fn(ReadFileInputSchema, async ({ path: filePath, limit }) => {
    try {
      const resolved = resolveInsideProjectRoot(absoluteProjectDir, filePath)
      const text = await Bun.file(resolved).text()
      const lines = text.split(/\r?\n/)

      if (limit && limit < lines.length) {
        const limited = lines.slice(0, limit)
        limited.push(`... (${lines.length - limit} more lines)`)
        return limited.join("\n").slice(0, 50_000)
      }

      return lines.join("\n").slice(0, 50_000)
    } catch (error) {
      return `Error: ${error}`
    }
  })
}

export function createProjectWriteFile(absoluteProjectDir: string) {
  const WriteFileInputSchema = z.object({
    path: z.string(),
    content: z.string(),
  })
  return fn(WriteFileInputSchema, async ({ path: filePath, content }) => {
    try {
      const resolved = resolveInsideProjectRoot(absoluteProjectDir, filePath)
      await ensureParentDir(resolved)
      await Bun.write(resolved, content)
      return `Wrote ${content.length} bytes to ${filePath}`
    } catch (error) {
      return `Error: ${error}`
    }
  })
}

export function createProjectEditFile(absoluteProjectDir: string) {
  const EditFileInputSchema = z.object({
    path: z.string(),
    old_text: z.string(),
    new_text: z.string(),
  })
  return fn(EditFileInputSchema, async ({ path: filePath, old_text, new_text }) => {
    try {
      const resolved = resolveInsideProjectRoot(absoluteProjectDir, filePath)
      const content = await Bun.file(resolved).text()

      if (!content.includes(old_text)) {
        return `Error: Text not found in ${filePath}`
      }

      await Bun.write(resolved, content.replace(old_text, new_text))
      return `Edited ${filePath}`
    } catch (error) {
      return `Error: ${error}`
    }
  })
}
