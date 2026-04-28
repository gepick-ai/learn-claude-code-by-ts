import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { NotFoundError } from "../../storage/error"
import { codeService } from "../../code/service"
import { errors } from "../error"
import { Project } from "./model"
import { projectService } from "./service"

const projectController = new Hono()

projectController
  .post("/",
    describeRoute({
      summary: "Create project",
      description: "Create a new project",
      operationId: "project.create",
      responses: {
        200: {
          description: "Project created",
          content: {
            "application/json": {
              schema: resolver(Project),
            },
          },
        },
      },
    }),
    async (c) => {
      const project = await projectService.createProject()
      return c.json(project)
    },
  )
  .get("/",
    describeRoute({
      summary: "List projects",
      description: "Get a list of all projects, sorted by most recently updated.",
      operationId: "project.list",
      responses: {
        200: {
          description: "List of projects",
          content: {
            "application/json": {
              schema: resolver(Project.array()),
            },
          },
        },
      },
    }),
    validator(
      "query",
      z.object({
        limit: z.coerce
          .number()
          .optional()
          .meta({ description: "Maximum number of projects to return" }),
        offset: z.coerce
          .number()
          .optional()
          .meta({ description: "Number of rows to skip (pagination)" }),
      }),
    ),
    async (c) => {
      const query = c.req.valid("query")
      const projects = await projectService.listProjects(query)
      return c.json(projects)
    },
  )
  .get("/:projectId/preview/*",
    describeRoute({
      summary: "Read workspace file for preview",
      description:
        "Code v3: serve a file under the project workspace with correct Content-Type for browser preview (same path guards as fs_read). Use for iframe src and relative subresources.",
      operationId: "project.readWorkspacePreview",
      responses: {
        200: {
          description: "File bytes",
          content: {
            "application/octet-stream": {
              schema: resolver(z.instanceof(Uint8Array)),
            },
          },
        },
        ...errors(400, 404),
      },
    }),
    validator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param")
      const pathname = new URL(c.req.url).pathname
      const prefix = `/project/${projectId}/preview`
      if (!pathname.startsWith(prefix)) {
        return c.notFound()
      }
      const rest = pathname.slice(prefix.length).replace(/^\/+/u, "")
      try {
        const { body, contentType } = await codeService.readWorkspacePreviewFile(projectId, rest)
        return c.body(new Uint8Array(body), 200, {
          "Content-Type": contentType,
          "Cache-Control": "private, no-store",
        })
      } catch (e) {
        if (e instanceof NotFoundError) {
          return c.json(e.toObject(), 404)
        }
        if (
          e instanceof Error &&
          (/Path escapes project workspace/.test(e.message) ||
            /Absolute paths are not allowed/.test(e.message) ||
            /Invalid URL encoding/.test(e.message) ||
            /Invalid path segment/.test(e.message))
        ) {
          return c.json({ error: e.message }, 400)
        }
        throw e
      }
    },
  )
  .get("/:projectId/workspace/file",
    describeRoute({
      summary: "Read workspace file",
      description:
        "Read a UTF-8 text file under the project workspace (same path rules as Agent fs_read). Read-only.",
      operationId: "project.readWorkspaceFile",
      responses: {
        200: {
          description: "File contents",
          content: {
            "text/plain": {
              schema: resolver(z.string()),
            },
          },
        },
        ...errors(400, 404),
      },
    }),
    validator("param", z.object({ projectId: z.string() })),
    validator(
      "query",
      z.object({
        path: z
          .string()
          .optional()
          .default("index.html")
          .meta({ description: "Path relative to project workspace root (e.g. index.html)" }),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param")
      const relPath = c.req.valid("query").path
      try {
        const text = await codeService.readWorkspaceTextFile(projectId, relPath)
        return c.body(text, 200, {
          "Content-Type": "text/plain; charset=utf-8",
        })
      } catch (e) {
        if (e instanceof NotFoundError) {
          return c.json(e.toObject(), 404)
        }
        if (
          e instanceof Error &&
          (/Path escapes project workspace/.test(e.message) ||
            /Absolute paths are not allowed/.test(e.message))
        ) {
          return c.json({ error: e.message }, 400)
        }
        throw e
      }
    },
  )

export default projectController
