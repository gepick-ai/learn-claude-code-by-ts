import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
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

export default projectController
