import z from "zod"

export const Project = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
}).meta({
    ref: "Project",
})
export type Project = z.infer<typeof Project>