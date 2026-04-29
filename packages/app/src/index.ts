import "./env"
import { Database } from "./storage/db"
import { buildApp } from "./server/app"

Database.Client()

const app = buildApp()
console.log("🚀 AI SDK server starting on http://localhost:3000")


export default {
  port: 3000,
  fetch: app.fetch,
}
