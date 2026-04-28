import { tool } from "ai"
import { z } from "zod"
import {
  bash as runBash,
  editFile as runEditFile,
  readFile as runReadFile,
  writeFile as runWriteFile,
} from "./tool-fs/fs-handlers"

export const agentTools = {
  bash: tool({
    description: "Run a shell command.",
    inputSchema: z.object({
      command: z.string().describe("The shell command to execute."),
    }),
    execute: async (input) => await runBash(input),
  }),
  read_file: tool({
    description: "Read file contents.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file to read."),
      limit: z
        .number()
        .int()
        .optional()
        .describe("Optional maximum number of lines to return."),
    }),
    execute: async (input) => await runReadFile(input),
  }),
  write_file: tool({
    description: "Write content to file.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file to write."),
      content: z.string().describe("The full content to write to the file."),
    }),
    execute: async (input) => await runWriteFile(input),
  }),
  edit_file: tool({
    description: "Replace exact text in file.",
    inputSchema: z.object({
      path: z.string().describe("The path of the file to edit."),
      old_text: z.string().describe("The exact text to replace."),
      new_text: z.string().describe("The replacement text."),
    }),
    execute: async (input) => await runEditFile(input),
  }),
}
