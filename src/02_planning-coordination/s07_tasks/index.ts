import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { authAnthropic, build, model } from "../../common/main";
import { type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
]);
const AUTH = authAnthropic()
const MODEL = model();
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use tools to solve tasks.`;