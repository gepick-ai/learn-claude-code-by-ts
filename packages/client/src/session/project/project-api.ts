import type { Project } from "@gepick/sdk"
import { sdk } from "@/util/sdk"

function data<T>(input: T | { data?: T; error?: unknown }, msg: string): T {
  if (input !== null && typeof input === "object" && "error" in input) {
    const err = (input as { error?: unknown }).error
    if (err) {
      if (err instanceof Error) throw err
      throw new Error(`${msg}: ${String(err)}`)
    }
  }
  if (
    input !== null &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    "data" in input
  ) {
    const v = (input as { data?: T }).data
    if (v === undefined) throw new Error(`${msg}: empty response body`)
    return v
  }
  if (input === undefined) throw new Error(`${msg}: empty response body`)
  return input as T
}

function mapProject(input: {
  id: string
  name?: string
  createdAt?: number | string
  updatedAt?: number | string
}): Project {
  return {
    id: input.id,
    name: input.name ?? "Untitled Project",
    createdAt:
      typeof input.createdAt === "number"
        ? input.createdAt
        : typeof input.createdAt === "string"
          ? Date.parse(input.createdAt) || 0
          : 0,
    updatedAt:
      typeof input.updatedAt === "number"
        ? input.updatedAt
        : typeof input.updatedAt === "string"
          ? Date.parse(input.updatedAt) || 0
          : 0,
  }
}

export async function listProjects(options?: { limit?: number; offset?: number }): Promise<Project[]> {
  const list = data(await sdk.project.list(options), "list projects failed")
  return list.map(mapProject)
}

export async function createProject(): Promise<Project> {
  const created = data(await sdk.project.create(), "create project failed")
  return mapProject(created)
}

