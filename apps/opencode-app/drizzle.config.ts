import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "drizzle-kit"

/** `apps/opencode-app` 根目录（与本文件同级）；与 opencode `drizzle.config` 同级放 `migration/` */
const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  dialect: "sqlite",
  schema: path.join(root, "src/server/**/sql.ts"),
  out: path.join(root, "migration"),
  dbCredentials: {
    url: `file:${path.join(root, ".data", "app.db")}`,
  },
})
