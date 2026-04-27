import { Tool, type ToolInstance, PermissionDeniedError } from "./base";
import { z } from "zod";
import { safePath } from "../util/fs";

// ==================== Bash Tool ====================
export const Bash = new Tool({
    name: "bash",
    description: "Run a shell command.",
    schema: z.object({
        command: z.string().trim().min(1, "Command must not be empty"),
    }),
    handler: async ({ command }) => {
        const dangerousPatterns = [
            /rm\s+-rf\s*(\/|(\*|\.\.\/)*\*)/,
            /sudo\s+/,
            /shutdown\b/,
            /reboot\b/,
            />.*\/dev\//,
            /dd\s+if=\/dev\/zero/,
            /mkfs\./,
            /mount\s+/,
            /umount\s+/,
            /chroot\s+/,
        ];

        if (dangerousPatterns.some(pattern => pattern.test(command))) {
            throw new PermissionDeniedError("Dangerous command blocked");
        }

        try {
            const proc = Bun.spawn(["sh", "-lc", command], {
                cwd: process.cwd(),
                stdout: "pipe",
                stderr: "pipe",
            });

            const timeoutMs = 120_000;

            const result = await Promise.race([
                (async () => {
                    const stdout = await new Response(proc.stdout).text();
                    const stderr = await new Response(proc.stderr).text();
                    await proc.exited;

                    const out = `${stdout}${stderr}`.trim();
                    return out ? out.slice(0, 50_000) : "(no output)";
                })(),
                (async () => {
                    await Bun.sleep(timeoutMs);
                    proc.kill();
                    throw new Error(`Timeout (${timeoutMs}ms)`);
                })(),
            ]);

            return result;
        } catch (error) {
            throw new Error(`Failed to execute command - ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});

// ==================== File Read Tool ====================
export const ReadFile = new Tool({
    name: "read_file",
    description: "Read file contents.",
    schema: z.object({
        path: z.string().trim().min(1, "File path must not be empty"),
        limit: z.number().int().min(1, "Limit must be at least 1").optional(),
    }),
    handler: async ({ path: filePath, limit }) => {
        try {
            const resolvedPath = safePath(filePath);
            const file = Bun.file(resolvedPath);
            
            if (!await file.exists()) {
                throw new Error(`File not found - ${filePath}`);
            }

            const text = await file.text();
            const lines = text.split(/\r?\n/);

            if (limit && limit < lines.length) {
                const limited = lines.slice(0, limit);
                limited.push(`... (${lines.length - limit} more lines)`);
                return limited.join("\n").slice(0, 50_000);
            }

            return lines.join("\n").slice(0, 50_000);
        } catch (error) {
            throw new Error(`Failed to read file - ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});

// ==================== File Write Tool ====================
export const WriteFile = new Tool({
    name: "write_file",
    description: "Write content to file.",
    schema: z.object({
        path: z.string().trim().min(1, "File path must not be empty"),
        content: z.string(),
    }),
    handler: async ({ path: filePath, content }) => {
        try {
            const resolvedPath = safePath(filePath);
            await Bun.write(resolvedPath, content);
            return `Wrote ${content.length} bytes to ${filePath}`;
        } catch (error) {
            throw new Error(`Failed to write file - ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});

// ==================== File Edit Tool ====================
export const EditFile = new Tool({
    name: "edit_file",
    description: "Replace exact text in file.",
    schema: z.object({
        path: z.string().trim().min(1, "File path must not be empty"),
        old_text: z.string().min(1, "Old text must not be empty"),
        new_text: z.string(),
    }),
    handler: async ({ path: filePath, old_text, new_text }) => {
        try {
            const resolvedPath = safePath(filePath);
            const file = Bun.file(resolvedPath);
            
            if (!await file.exists()) {
                throw new Error(`File not found - ${filePath}`);
            }

            const content = await file.text();

            if (!content.includes(old_text)) {
                const context = getSearchContext(content, old_text);
                throw new Error(`Text not found in ${filePath}${context}`);
            }

            await Bun.write(resolvedPath, content.replace(old_text, new_text));
            return `Edited ${filePath}`;
        } catch (error) {
            throw new Error(`Failed to edit file - ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});

// ==================== Tool Registry ====================
export const ALL_TOOLS = [Bash, ReadFile, WriteFile, EditFile];

export const TOOL_MAP: Record<string, ToolInstance> = Object.fromEntries(
    ALL_TOOLS.map((tool) => [tool.definition.name, tool])
);

export const ANTHROPIC_TOOLS = ALL_TOOLS.map((tool) => tool.anthropicTool);

// ==================== Helper Functions ====================
function getSearchContext(content: string, searchText: string): string {
    const previewLines = 3;
    const previewLength = 100;
    
    if (searchText.length > previewLength) {
        const preview = searchText.slice(0, previewLength);
        return `\n\nLooking for: ${preview}...`;
    }
    
    return "";
}

export { type ToolInstance as Tool };
