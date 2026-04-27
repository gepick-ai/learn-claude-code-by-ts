import type Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { fn } from "../../common/util/fn";
import z from "zod";
import { createTracer } from "../../common/util/trace";

const trace = createTracer("Skills");

const LoadSkill = {
    name: "load_skill",
    description: "Load specialized knowledge by name.",
    input_schema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Skill name to load",
            },
        },
        required: ["name"],
    },
} satisfies Anthropic.Tool;

class SkillLoader {
    skills: Record<string, { meta: Record<string, string>; body: string; path: string }> = {};

    constructor(public readonly skillsDir: string) { }

    async loadAll() {
        this.skills = {};

        try {
            await readdir(this.skillsDir);
        } catch {
            return;
        }

        const files = await this.findSkillFiles(this.skillsDir);

        for (const filePath of files.sort()) {
            const text = await Bun.file(filePath).text();
            const [meta, body] = this.parseFrontmatter(text);
            const name = meta.name ?? path.basename(path.dirname(filePath));

            this.skills[name] = {
                meta,
                body,
                path: filePath,
            };
        }
    }

    private async findSkillFiles(dir: string): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });
        const files: string[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                files.push(...await this.findSkillFiles(fullPath));
            } else if (entry.isFile() && entry.name === "SKILL.md") {
                files.push(fullPath);
            }
        }

        return files;
    }

    private parseFrontmatter(text: string): [Record<string, string>, string] {
        const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) {
            return [{}, text];
        }

        const frontmatter = match[1] ?? "";
        const body = match[2] ?? "";
        const meta: Record<string, string> = {};
        for (const line of frontmatter.trim().split(/\r?\n/)) {
            const colonIndex = line.indexOf(":");
            if (colonIndex === -1) continue;

            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            meta[key] = value;
        }

        return [meta, body.trim()];
    }

    getDescriptions() {
        if (Object.keys(this.skills).length === 0) {
            return "(no skills available)";
        }

        const lines: string[] = [];

        for (const [name, skill] of Object.entries(this.skills)) {
            const desc = skill.meta.description ?? "No description";
            const tags = skill.meta.tags ?? "";
            let line = `  - ${name}: ${desc}`;

            if (tags) {
                line += ` [${tags}]`;
            }

            lines.push(line);
        }

        return lines.join("\n");
    }

    getContent(name: string) {
        const skill = this.skills[name];
        if (!skill) {
            return `Error: Unknown skill '${name}'. Available: ${Object.keys(this.skills).join(", ")}`;
        }

        return `<skill name="${name}">\n${skill.body}\n</skill>`;
    }
}
const skillLoader = new SkillLoader(path.join(import.meta.dir, "skills"));
await skillLoader.loadAll();

const LoadSkillInputSchema = z.object({
    name: z.string(),
});
const loadSkill = fn(LoadSkillInputSchema, async ({ name }) => {
    const SKILL_NAME_COLOR = "\x1b[36m";
    const RESET_COLOR = "\x1b[0m";
    trace.log(`loading ${SKILL_NAME_COLOR}${name}${RESET_COLOR} skill...`);
    return skillLoader.getContent(name);
});

export {
    LoadSkill,
    loadSkill,
    skillLoader,
}