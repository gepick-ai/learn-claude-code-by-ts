import { Database } from "./storage/db"
import { createApp } from "./server/app"

Database.Client()

console.log("🚀 AI SDK server starting on http://localhost:3000")
const app = createApp()

export default {
  port: 3000,
  fetch: app.fetch,
}
