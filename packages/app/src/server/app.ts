import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { NotFoundError } from "../storage/error"
import { NamedError, UnknownError } from "@gepick/core"
import projectController from "./project/controller"
import sessionController from "./session/controller"
import sseController from "./sse/controller"
import { openAPIRouteHandler } from "hono-openapi"
import { lazy } from "../util/lazy"

export function createApp() {
  const app = new Hono()
  app
    .use(cors())
    .onError((err, c) => {
      if (err instanceof NamedError) {
        if (err instanceof NotFoundError) {
          return c.json(err.toObject(), 404)
        }
        return c.json(err.toObject(), 500)
      }
      if (err instanceof HTTPException) {
        return err.getResponse()
      }
      const message = err instanceof Error && err.stack ? err.stack : String(err)
      return c.json(new UnknownError({ message }).toObject(), 500)
    })
    .get("/doc", openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: "gepick",
          version: "0.0.3",
          description: "gepick api",
        },
        openapi: "3.1.1",
      },
    }))
    .route("/project", projectController)
    .route("/session", sessionController)
    .route("/sse", sseController)
    .get("/", (c) => c.json({ service: "gepick-app", documentation: "/doc" }))

  return app
}


export const buildApp = lazy(() => createApp())