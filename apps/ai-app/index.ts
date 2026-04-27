import { Hono } from "hono";
import { cors } from "hono/cors";
import sessionController from "./server/session/controller";

const app = new Hono();
app.use(cors());

app.route("/api/session", sessionController);

app.get("/", async (c) => {
  return c.html(await Bun.file("./ai-app/server/frontend.html").text());
});

console.log("🚀 AI SDK server starting on http://localhost:3000");

export default {
  port: 3000,
  fetch: app.fetch,
};
