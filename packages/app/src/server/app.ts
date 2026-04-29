import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { NotFoundError } from "../storage/error"
import { NamedError, UnknownError } from "@gepick/core"
import projectController from "./project/controller"
import sessionController from "./session/controller"
import sseController from "./sse/controller"
import { openAPIRouteHandler } from "hono-openapi"
import { lazy } from "../util/lazy"

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))

function resolveStaticRoot() {
  const candidates = [
    path.resolve(MODULE_DIR, "./static"),
    path.resolve(MODULE_DIR, "../static"),
    path.resolve(MODULE_DIR, "../../static"),
    path.resolve(MODULE_DIR, "../../../static"),
  ]
  return candidates.find((dir) => fs.existsSync(dir))
}

function contentTypeByPath(absolutePath: string) {
  const ext = path.extname(absolutePath).toLowerCase()
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8"
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8"
    case ".css":
      return "text/css; charset=utf-8"
    case ".json":
      return "application/json; charset=utf-8"
    case ".svg":
      return "image/svg+xml"
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".gif":
      return "image/gif"
    case ".webp":
      return "image/webp"
    case ".ico":
      return "image/x-icon"
    case ".map":
      return "application/json; charset=utf-8"
    default:
      return "application/octet-stream"
  }
}

async function serveStaticFile(absolutePath: string) {
  const file = Bun.file(absolutePath)
  if (!(await file.exists())) {
    return new Response("Not Found", { status: 404 })
  }
  return new Response(file, {
    headers: {
      "Content-Type": file.type || contentTypeByPath(absolutePath),
    },
  })
}

export function createApp() {
  const app = new Hono()
  const staticRoot = resolveStaticRoot()
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
    .get("/assets/*", (c) => {
      if (!staticRoot) {
        return c.json({ service: "gepick-app", documentation: "/doc" })
      }
      const rel = c.req.path.replace(/^\/+/, "")
      return serveStaticFile(path.join(staticRoot, rel))
    })
    .get("/", (c) => {
      if (!staticRoot) {
        return c.json({ service: "gepick-app", documentation: "/doc" })
      }
      return serveStaticFile(path.join(staticRoot, "index.html"))
    })

  return app
}


export const buildApp = lazy(() => createApp())