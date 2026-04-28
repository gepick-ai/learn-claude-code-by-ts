import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { NotFoundError } from "../../storage/error"
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
        const text = await projectService.readWorkspaceTextFile(projectId, relPath)
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
