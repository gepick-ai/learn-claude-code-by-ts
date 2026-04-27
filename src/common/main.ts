import Anthropic from "@anthropic-ai/sdk";
// import OpenAI from "openai";
import readline from "node:readline";
import { createTracer } from "./util/trace";
import { loadDotEnv } from "./util/env";

loadDotEnv();

export const auth = () => new Anthropic({
    apiKey:  process.env.ANTHROPIC_API_KEY!,
    baseURL: process.env.ANTHROPIC_BASE_URL!,
});

// export const authOpenAI = () => new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY!,
//     baseURL: process.env.OPENAI_BASE_URL!,
// });

export const model = () => process.env.MODEL_ID ?? process.env.OPENAI_MODEL!;

export type BuildOptions = {
    label?: string;
    model?: string;
    system?: string;
    /**
     * 在渲染 User、调用 `loop` 之前执行。
     * 若返回 `true`，表示输入已由插槽处理（如 `/team`），**跳过**本次 `loop`，主循环形态不变。
     */
    interceptInput?: (query: string) => boolean | Promise<boolean>;
};

const PROMPT_TEXT = "请输入prompt >>> ";
const PROMPT_COLOR = "\x1b[33m";
const RESET_COLOR = "\x1b[0m";
const USER_COLOR = "\x1b[36m";
const ASSISTANT_COLOR = "\x1b[35m";

function renderMessageBlock(label: string, text: string, color: string) {
    const border = `${color}${"=".repeat(12)} ${label} ${"=".repeat(12)}${RESET_COLOR}`;
    console.log();
    console.log(border);
    console.log(text);
    console.log(`${color}${"=".repeat(border.length - color.length - RESET_COLOR.length)}${RESET_COLOR}`);
}

export const build = (
    loop: (prompt:string) => Promise<Anthropic.MessageParam[]>,
) => ({
    run: async (options: BuildOptions = {}) => {
        const tracer = createTracer(options.label ?? "root");

        if (options.model) {
            tracer.log("model", options.model);
        }

        if (options.system) {
            tracer.log("system", options.system);
        }

        function askInput(rl: readline.Interface, label: string) {
            return new Promise<string>((resolve) => {
                rl.question(label, resolve);
            });
        }
    
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
        });
    
        try {
            while (true) {
                const promptLabel = process.stdout.isTTY
                    ? `${PROMPT_COLOR}${PROMPT_TEXT}${RESET_COLOR}`
                    : PROMPT_TEXT;
                const query = await askInput(rl, promptLabel);
    
                if (["q", "exit", ""].includes(query.trim().toLowerCase())) {
                    break;
                }

                if (options.interceptInput) {
                    const skip = await options.interceptInput(query);
                    if (skip) {
                        continue;
                    }
                }

                renderMessageBlock("User", query, USER_COLOR);

                await loop(query).then((history) => {
                    const responseContent = history.at(-1)?.content;
                    const textBlocks: string[] = [];
        
                    if (Array.isArray(responseContent)) {
                        for (const block of responseContent) {
                            if (block.type === "text") {
                                textBlocks.push(block.text);
                            }
                        }
                    }
    
                    if (textBlocks.length > 0) {
                        renderMessageBlock("Assistant", textBlocks.join("\n\n"), ASSISTANT_COLOR);
                    }
                })
            }
        } catch (error) {
            // @ts-ignore
            tracer.error("Main loop error:", error);
            console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error");
        } finally {
            rl.close();
        }
    }
})