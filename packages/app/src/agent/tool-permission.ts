import z from "zod";

export const ToolPermissionAction = z.enum(["allow", "deny"]).meta({ ref: "ToolPermissionAction" })
export type ToolPermissionAction = z.infer<typeof ToolPermissionAction>

export const ToolPermissionRule = z.object({
  permission: z.string(),
  pattern: z.string(),
  action: ToolPermissionAction,
}).meta({ ref: "ToolPermissionRule"})
export type ToolPermissionRule = z.infer<typeof ToolPermissionRule>

export const ToolPermissionRuleset = ToolPermissionRule.array().meta({ ref: "ToolPermissionRuleset" })
export type ToolPermissionRuleset = z.infer<typeof ToolPermissionRuleset>

class ToolPermissionService {

}


export const toolPermissionService =  new ToolPermissionService()