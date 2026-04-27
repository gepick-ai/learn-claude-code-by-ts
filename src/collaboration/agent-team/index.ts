import Anthropic from "@anthropic-ai/sdk";
import { auth, build, model } from "../../common/main";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { MemberManager, memberManager, messageBus, MessageBus, WORKDIR } from "./tools";

const tracer = createTracer("agent-team");

const TOOL_HANDLERS = new Map<string, (input: unknown) => Promise<string>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["add_member", MemberManager.addMember],
    ["list_members", MemberManager.listMembers],
    ["send_message", (input) => MessageBus.sendMessage("lead", input)],
    ["read_message", (input) => MessageBus.readMessage("lead", input)],
    ["broadcast", (input) => MessageBus.broadcast("lead", input)],
]);

const AUTH = auth();
const MODEL = model();
const SYSTEM = `You are a team lead at ${WORKDIR}. Create and manage team members and communicate via inboxes.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,
    MemberManager.AddMember,
    MemberManager.ListMembers,
    MessageBus.SendMessage,
    MessageBus.ReadMessage,
    MessageBus.Broadcast,
];

const messages: Anthropic.MessageParam[] = [];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    messages.push({
        role: "user",
        content: prompt,
    });

    while (true) {
        const inbox = await messageBus.read("lead");

        if (inbox.length > 0) {
            messages.push({
                role: "user",
                content: `<inbox>${JSON.stringify(inbox, null, 2)}</inbox>`,
            });
            messages.push({
                role: "assistant",
                content: "Noted inbox messages.",
            });
        }

        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: TOOLS,
            max_tokens: 8000,
        });

        messages.push({
            role: "assistant",
            content: response.content,
        });

        if (response.stop_reason !== "tool_use") {
            tracer.log("lead_loop_exit", `stop_reason=${response.stop_reason}`);
            break;
        }

        const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];
        for (const block of response.content) {
            if (block.type === "tool_use") {
                let output = "";
                const handler = TOOL_HANDLERS.get(block.name);

                if (!handler) {
                    output = `Unknown tool: ${block.name}`;
                } else {
                    try {
                        output = await handler(block.input);
                    } catch (err) {
                        output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
                    }
                }

                tracer.log("tool_result", `used ${block.name} by lead`);

                results.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: output,
                });
            }
        }

        messages.push({
            role: "user",
            content: results,
        });
    }

    return messages;
}

build(loop).run({
    label: "协作 >> Agent团队",
    model: MODEL,
    system: SYSTEM,
    interceptInput: async (query) => {
        const t = query.trim();
        if (t === "/team") {
            console.log(memberManager.listMembers());
            return true;
        }
        if (t === "/inbox") {
            console.log(JSON.stringify(await messageBus.read("lead"), null, 2));
            return true;
        }
        return false;
    },
});
