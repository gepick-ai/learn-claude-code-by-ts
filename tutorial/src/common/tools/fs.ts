import { z } from "zod";
import { fn } from "../util/fn";
import { safePath } from "../util/fs";
import type Anthropic from "@anthropic-ai/sdk";

const Bash =  {
    name: "bash",
    description: "Run a shell command.",
    input_schema: {
        type: "object",
        properties: {
            command: { type: "string" },
        },
        required: ["command"],
    },
} satisfies Anthropic.Tool;
const BashInputSchema = z.object({
    command: z.string(),
});
const bash = fn(BashInputSchema, async ({ command }) => {
    const dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"];

    if (dangerous.some((item) => command.includes(item))) {
        return "Error: Dangerous command blocked";
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
                return "Error: Timeout (120s)";
            })(),
        ]);

        return result;
    } catch {
        return "Error: Failed to execute command";
    }
});
export {
    Bash,
    bash 
}


const ReadFile = {
    name: "read_file",
    description: "Read file contents.",
    input_schema: {
        type: "object",
        properties: {
            path: { type: "string" },
            limit: { type: "integer" },
        },
        required: ["path"],
    },
} satisfies Anthropic.Tool;
const ReadFileInputSchema = z.object({
    path: z.string(),
    limit: z.number().int().optional(),
});
const readFile = fn(ReadFileInputSchema, async ({ path: filePath, limit }) => {
    try {
        const text = await Bun.file(safePath(filePath)).text();
        const lines = text.split(/\r?\n/);

        if (limit && limit < lines.length) {
            const limited = lines.slice(0, limit);
            limited.push(`... (${lines.length - limit} more lines)`);
            return limited.join("\n").slice(0, 50_000);
        }

        return lines.join("\n").slice(0, 50_000);
    } catch (error) {
        return `Error: ${error}`;
    }
});
export {
    ReadFile,
    readFile 
}


const WriteFile = {
    name: "write_file",
    description: "Write content to file.",
    input_schema: {
        type: "object",
        properties: {
            path: { type: "string" },
            content: { type: "string" },
        },
        required: ["path", "content"],
    },
} satisfies Anthropic.Tool;
const WriteFileInputSchema = z.object({
    path: z.string(),
    content: z.string(),
});
const writeFile = fn(WriteFileInputSchema, async ({ path: filePath, content }) => {
    try {
        const resolvedPath = safePath(filePath);
        await Bun.write(resolvedPath, content);
        return `Wrote ${content.length} bytes to ${filePath}`;
    } catch (error) {
        return `Error: ${error}`;
    }
});
export {
    WriteFile,
    writeFile 
}


const EditFile = {
    name: "edit_file",
    description: "Replace exact text in file.",
    input_schema: {
        type: "object",
        properties: {
            path: { type: "string" },
            old_text: { type: "string" },
            new_text: { type: "string" },
        },
        required: ["path", "old_text", "new_text"],
    },
} satisfies Anthropic.Tool;
const EditFileInputSchema = z.object({
    path: z.string(),
    old_text: z.string(),
    new_text: z.string(),
});
const editFile = fn(EditFileInputSchema, async ({ path: filePath, old_text, new_text }) => {
    try {
        const resolvedPath = safePath(filePath);
        const content = await Bun.file(resolvedPath).text();

        if (!content.includes(old_text)) {
            return `Error: Text not found in ${filePath}`;
        }

        await Bun.write(resolvedPath, content.replace(old_text, new_text));
        return `Edited ${filePath}`;
    } catch (error) {
        return `Error: ${error}`;
    }
});
export {
    EditFile,
    editFile 
}