import type Anthropic from "@anthropic-ai/sdk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import z from "zod";
import path from "node:path";
import { fn } from "../../common/util/fn";
import { appendFile } from "node:fs/promises";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { auth, model } from "../../common/main";

export const WORKDIR = path.resolve(import.meta.dir, ".");
export const TEAM_DIR = path.join(WORKDIR, ".team");
export const INBOX_DIR = path.join(TEAM_DIR, "inbox");

// #region MemberManager

class MemberManager {
    private readonly configPath: string;
    private config: MemberManager.TeamConfig;

    constructor(public readonly teamDir: string) {
        mkdirSync(this.teamDir, { recursive: true });
        this.configPath = path.join(this.teamDir, "config.json");
        this.config = this.loadConfig();
    }

    private loadConfig(): MemberManager.TeamConfig {
        if (!existsSync(this.configPath)) {
            return structuredClone(MemberManager.DEFAULT_CONFIG);
        }
        try {
            const raw = readFileSync(this.configPath, "utf-8");
            const parsed = JSON.parse(raw) as MemberManager.TeamConfig;
            if (!parsed.members || !Array.isArray(parsed.members)) {
                return structuredClone(MemberManager.DEFAULT_CONFIG);
            }
            if (typeof parsed.team_name !== "string") {
                parsed.team_name = MemberManager.DEFAULT_CONFIG.team_name;
            }
            return parsed;
        } catch {
            return structuredClone(MemberManager.DEFAULT_CONFIG);
        }
    }

    private saveConfig(): void {
        writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
    }

    get memberNames(): string[] {
        return this.config.members.map((m) => m.name);
    }

    listMembers(): string {
        if (this.config.members.length === 0) {
            return "No members.";
        }
        const lines: string[] = [`Team: ${this.config.team_name}`];
        for (const m of this.config.members) {
            lines.push(`  ${m.name} (${m.role}): ${m.status}`);
        }
        return lines.join("\n");
    }

    private findMember(name: string): MemberManager.Member | undefined {
        return this.config.members.find((m) => m.name === name);
    }

    addMember(role: string, name: string, prompt: string): string {
        let member = this.findMember(name);

        if (!member) {
            member = { name, role, status: "working" };
            this.config.members.push(member);
        } else {
            if (member.status !== "idle" && member.status !== "shutdown") {
                return `Error: '${name}' is currently ${member.status}`;
            }
            member.status = "working";
            member.role = role;
        }

        this.saveConfig();

        this.runMember(member, prompt);

        return `Added '${name}' (role: ${role})`;
    }

    private runMember(member: MemberManager.Member, prompt: string): void {
        (async () => {
            const AUTH = auth();
            const MODEL = model();
            const SYSTEM = [
                `You are '${member.name}', role: ${member.role}, at ${WORKDIR}.`,
                `Use send_message to communicate. Complete your task.`
            ].join(" ");


            const messages: Anthropic.MessageParam[] = [
                { role: "user", content: prompt },
            ];

            const TOOLS: Anthropic.Tool[] = [
                Bash,
                ReadFile,
                WriteFile,
                EditFile,
                MessageBus.SendMessage,
                MessageBus.ReadMessage
            ];

            const toolHandlers = new Map<string, (input: unknown) => Promise<string>>([
                ["bash", bash],
                ["read_file", readFile],
                ["write_file", writeFile],
                ["edit_file", editFile],
                ["send_message", (input) => MessageBus.sendMessage(member.name, input)],
                ["read_message", (input) => MessageBus.readMessage(member.name, input)],
            ]);


            try {
                for (let step = 0; step < MemberManager.MAX_MEMBER_ITERS; step++) {

                    const inbox = await messageBus.read(member.name);
                    for (const msg of inbox) {
                        messages.push({
                            role: "user",
                            content: JSON.stringify(msg),
                        });
                    }

                    let response: Anthropic.Message;
                    try {
                        response = await AUTH.messages.create({
                            model: MODEL,
                            system: SYSTEM,
                            messages,
                            tools: TOOLS,
                            max_tokens: 8000,
                        });
                    } catch (err) {
                        break;
                    }

                    messages.push({ role: "assistant", content: response.content });


                    if (response.stop_reason !== "tool_use") {
                        break;
                    }

                    const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];

                    for (const block of response.content) {
                        if (block.type === "tool_use") {
                            let output = '';
                            const handler = toolHandlers.get(block.name);

                            if (!handler) {
                                output = `Unknown tool: ${block.name}`;
                            } else {
                                try {
                                    output = await handler(block.input);
                                } catch (err) {
                                    output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
                                }
                            }

                            results.push({
                                type: "tool_result",
                                tool_use_id: block.id,
                                content: output,
                            });
                        }
                    }

                    messages.push({ role: "user", content: results });
                }
            } finally {
                if (member && member.status !== "shutdown") {
                    member.status = "idle";
                    this.saveConfig();
                }
            }
        })().catch((err) => {
            console.error(`Error running member ${member.name}:`, err);
        });
    }
}
namespace MemberManager {
    export const MAX_MEMBER_ITERS = 50;

    export type MemberStatus = "working" | "idle" | "shutdown";

    export type Member = {
        name: string;
        role: string;
        status: MemberStatus;
    };

    export type TeamConfig = {
        team_name: string;
        members: Member[];
    };

    export const DEFAULT_CONFIG: TeamConfig = {
        team_name: "default",
        members: [],
    };


    // add member tool
    export const AddMember = {
        name: "add_member",
        description:
            "Add ONE persistent team member (runs in background, sandbox tools). " +
            "You MUST pass exactly these string fields: name, role, prompt. " +
            "To add multiple people, call add_member once per person (e.g. alice, then bob). " +
            "Example: { \"name\": \"alice\", \"role\": \"coder\", \"prompt\": \"...\" }.",
        input_schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Member id / short name, e.g. alice",
                },
                role: { type: "string", description: "Short role label, e.g. coder" },
                prompt: {
                    type: "string",
                    description: "Initial task instructions for this member",
                },
            },
            required: ["name", "role", "prompt"],
        },
    } satisfies Anthropic.Tool;
    export const AddMemberInput = z.object({
        role: z.string(),
        name: z.string(),
        prompt: z.string(),
    });
    export const addMember = fn(AddMemberInput, async ({ role, name, prompt }) => {
        return memberManager.addMember(role, name, prompt);
    });


    // list members tool
    export const ListMembers = {
        name: "list_members",
        description: "List all team members with name, role, and status.",
        input_schema: {
            type: "object",
            properties: {},
        },
    } satisfies Anthropic.Tool;
    const ListMembersInput = z.object({});
    export const listMembers = fn(ListMembersInput, async () => {
        return memberManager.listMembers();
    });
}

const memberManager = new MemberManager(TEAM_DIR);

export {
    memberManager,
    MemberManager
}
// #endregion



// #region MessageBus

//             [inbox] Alice
//                       \
//                        \
//    Lead [inbox]---- ( Bus ) ----[inbox] Bob
//                      /
//                     /
//                    /
//              [inbox] Carol

// 各成员从自己 inbox 收、用 messageBus 往对方 inbox 投。因此整体理解 MessageBus 就是消息路由，路由各成员的消息。
class MessageBus {
    constructor(private readonly dir: string) {
        mkdirSync(this.dir, { recursive: true });
    }

    getInboxPath(name: string): string {
        return path.join(this.dir, `${name}.jsonl`)
    }

    // 将信息发送到指定成员的inbox
    async send(
        msgType: MessageBus.MessageType,
        from: string,
        to: string,
        content: string,
        extra?: Record<string, unknown>,
    ): Promise<string> {
        if (!MessageBus.VALID_MSG_TYPES.safeParse(msgType).success) {
            return `Error: Invalid type '${msgType}'. Valid: ${MessageBus.VALID_MSG_TYPES.options.join(", ")}`;
        }

        const msg: Record<string, unknown> = {
            type: msgType,
            from,
            content,
            timestamp: Date.now() / 1000,
            ...extra,
        };

        await appendFile(this.getInboxPath(to), `${JSON.stringify(msg)}\n`, "utf-8");

        return `Sent ${msgType} to ${to}`;
    }

    // 读取指定成员inbox消息并清空该inbox
    async read(name: string): Promise<MessageBus.Message[]> {
        const inboxPath = this.getInboxPath(name);

        const file = Bun.file(inboxPath);
        if (!(await file.exists())) {
            return [];
        }
        const messages: MessageBus.Message[] = [];
        const text = await file.text();
        for (const line of text.trim().split(/\r?\n/)) {
            if (line) {
                messages.push(JSON.parse(line) as MessageBus.Message);
            }
        }

        await Bun.write(inboxPath, "");

        return messages;
    }

    // 将信息发送到所有成员的inbox
    async broadcast(from: string, content: string, members: string[]): Promise<string> {
        let count = 0;
        for (const name of members) {
            if (name !== from) {
                await this.send("broadcast", from, name, content);
                count += 1;
            }
        }
        return `Broadcast to ${count} members`;
    }
}
const messageBus = new MessageBus(INBOX_DIR);

namespace MessageBus {
    export const VALID_MSG_TYPE_LIST = [
        "message",
        "broadcast",
        "shutdown_request",
        "shutdown_response",
        "plan_approval_response",
    ] as const;

    export const VALID_MSG_TYPES = z.enum(VALID_MSG_TYPE_LIST);

    export type MessageType = z.infer<typeof VALID_MSG_TYPES>;

    export type Message = {
        type: MessageType;
        from: string;
        content: string;
        timestamp: number;
        [key: string]: unknown;
    }

    // send message tool
    export const SendMessage = {
        name: "send_message",
        description: "Send a message to a member's inbox.",
        input_schema: {
            type: "object",
            properties: {
                to: { type: "string" },
                content: { type: "string" },
                msg_type: {
                    type: "string",
                    enum: [...VALID_MSG_TYPE_LIST],
                },
            },
            required: ["to", "content"],
        },
    } satisfies Anthropic.Tool;
    const SendMessageInput = z.object({
        to: z.string(),
        content: z.string(),
        msg_type: z.enum(VALID_MSG_TYPE_LIST).optional(),
    });

    export async function sendMessage(sender: string, rawInput: unknown): Promise<string> {
        const args = SendMessageInput.parse(rawInput ?? {});
        return messageBus.send(args.msg_type ?? "message", sender, args.to, args.content);
    }

    // read message tool
    export const ReadMessage = {
        name: "read_message",
        description:
            "Read and drain pending messages from the inbox queue (queue is cleared after read).",
        input_schema: {
            "type": "object",
            "properties": {}
        },
    } satisfies Anthropic.Tool;
    const ReadMessageInput = z.object({});

    export async function readMessage(sender: string, rawInput: unknown): Promise<string> {
        ReadMessageInput.parse(rawInput ?? {});
        return JSON.stringify(await messageBus.read(sender), null, 2);
    }

    // broadcast message tool
    export const Broadcast = {
        name: "broadcast",
        description: "Send a message to all members.",
        input_schema: {
            type: "object",
            properties: {
                content: { type: "string" },
            },
            required: ["content"],
        },
    } satisfies Anthropic.Tool;
    const BroadcastInput = z.object({
        content: z.string(),
    });

    export async function broadcast(from: string, rawInput: unknown): Promise<string> {
        const { content } = BroadcastInput.parse(rawInput ?? {});
        return messageBus.broadcast(from, content, memberManager.memberNames);
    }
}

export {
    messageBus,
    MessageBus
}
// #endregion