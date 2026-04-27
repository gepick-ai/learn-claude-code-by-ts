import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { fn, type WrappedFn } from "../util/fn";

// ==================== Error Types ====================
export class ToolExecutionError extends Error {
    constructor(public readonly cause?: Error) {
        super("Tool execution failed");
        this.name = "ToolExecutionError";
    }
}

export class ValidationError extends Error {
    constructor(public readonly issues: z.ZodIssue[]) {
        super("Validation failed");
        this.name = "ValidationError";
    }
}

export class PermissionDeniedError extends Error {
    constructor(public readonly reason: string) {
        super("Permission denied");
        this.name = "PermissionDeniedError";
    }
}

// ==================== Interfaces ====================
export interface ToolDefinition<InputSchema extends z.ZodTypeAny> {
    name: string;
    description: string;
    schema: InputSchema;
    handler: (input: z.infer<InputSchema>) => Promise<string>;
}

export interface ToolMetadata {
    name: string;
    description: string;
    input_schema: Anthropic.Tool["input_schema"];
}

// ==================== Tool Class ====================
export class Tool<InputSchema extends z.ZodTypeAny> {
    public readonly metadata: ToolMetadata;
    public readonly handler: WrappedFn<InputSchema, Promise<string>>;
    public readonly schema: InputSchema;
    public readonly name: string;
    public readonly description: string;

    constructor(public readonly definition: ToolDefinition<InputSchema>) {
        this.name = definition.name;
        this.description = definition.description;
        this.schema = definition.schema;
        
        this.metadata = {
            name: definition.name,
            description: definition.description,
            input_schema: this.convertToAnthropicSchema(definition.schema),
        };

        this.handler = fn(definition.schema, definition.handler);
    }

    public get anthropicTool(): Anthropic.Tool {
        return this.metadata;
    }

    /**
     * Convert Zod schema to Anthropic tool input schema
     * Improved version with better type handling
     */
    private convertToAnthropicSchema(schema: z.ZodTypeAny): Anthropic.Tool["input_schema"] {
        try {
            // First, try to use Zod's built-in conversion
            const schemaJson = schema.safeParse({}).success ? schema : z.object({});
            
            // Convert Zod schema to JSON schema
            const jsonSchema = schemaJson._def.schema;
            
            // Handle specific Zod types
            if (schema instanceof z.ZodString) {
                return { type: "string" };
            }
            if (schema instanceof z.ZodNumber) {
                return { type: "number" };
            }
            if (schema instanceof z.ZodBoolean) {
                return { type: "boolean" };
            }
            if (schema instanceof z.ZodArray) {
                return { 
                    type: "array", 
                    items: this.convertToAnthropicSchema(schema.element) 
                };
            }
            if (schema instanceof z.ZodObject) {
                const shape = schema.shape;
                const properties: Record<string, any> = {};
                const required: string[] = [];

                Object.entries(shape).forEach(([key, value]) => {
                    properties[key] = this.convertToAnthropicSchema(value);
                    
                    const isOptional = (value as any).isOptional?.() || 
                                      (value as any)._def.typeName === "ZodOptional" ||
                                      (value as any)._def.typeName === "ZodNullable";
                    
                    if (!isOptional) {
                        required.push(key);
                    }
                });

                return {
                    type: "object",
                    properties,
                    required: required.length > 0 ? required : undefined,
                    additionalProperties: false,
                };
            }

            // Fallback to generic object type
            return { type: "object", properties: {}, additionalProperties: true };
        } catch (error) {
            console.error(`Failed to convert schema for tool ${this.name}:`, error);
            return { type: "object", properties: {}, additionalProperties: true };
        }
    }

    /**
     * Execute the tool with proper error handling
     */
    public async execute(input: unknown): Promise<string> {
        try {
            return await this.handler(input);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationError = new ValidationError(error.issues);
                return `Error: ${validationError.name} - ${JSON.stringify(validationError.issues)}`;
            }
            if (error instanceof PermissionDeniedError) {
                return `Error: ${error.name} - ${error.reason}`;
            }
            if (error instanceof ToolExecutionError) {
                return `Error: ${error.name} - ${error.cause?.message || error.message}`;
            }
            const executionError = new ToolExecutionError(error as Error);
            return `Error: ${executionError.name} - ${executionError.cause?.message || "Unknown error"}`;
        }
    }
}

export type ToolInstance = Tool<z.ZodTypeAny>;
