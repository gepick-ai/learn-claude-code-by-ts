/**
 * ============================================
 * Web 应用主入口
 * ============================================
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import sessionController from "./server/session/controller";

const app = new Hono();
app.use(cors());

// 分别挂载 controller 到主 Hono
app.route("/api/session", sessionController);

// 前端页面
app.get("/", async (c) => {
  return c.html(await Bun.file("./app/server/frontend.html").text());
});

console.log("🚀 Server starting on http://localhost:3000");
export default {
  port: 3000,
  fetch: app.fetch,
};
