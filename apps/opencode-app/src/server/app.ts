import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import z from "zod"
import { BadRequestError, NamedError, NotFoundError } from "../util/error"
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
        if (err instanceof BadRequestError) {
          return c.json(err.toObject(), 400)
        }
        return c.json(err.toObject(), 500)
      }
      if (err instanceof HTTPException) {
        return err.getResponse()
      }
      if (err instanceof z.ZodError) {
        return c.json(new BadRequestError({ message: "Invalid request" }).toObject(), 400)
      }
      const message = err instanceof Error && err.stack ? err.stack : String(err)
      return c.json(new NamedError.Unknown({ message }).toObject(), 500)
    })
    .get("/doc", openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: "opencode",
          version: "0.0.3",
          description: "opencode api",
        },
        openapi: "3.1.1",
      },
    }))
    .route("/session", sessionController)
    .route("/sse", sseController)

  const htmlPath = new URL("./frontend.html", import.meta.url)
  app.get("/", async (c) => c.html(await Bun.file(htmlPath).text()))
  return app
}


export const buildApp = lazy(() => createApp())