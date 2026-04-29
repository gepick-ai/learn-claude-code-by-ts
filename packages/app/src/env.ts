import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

const envCandidates = [
  path.resolve(moduleDir, ".env"),
  path.resolve(moduleDir, "../.env"),
  path.resolve(moduleDir, "../../.env"),
]

const envPath = envCandidates.find((p) => fs.existsSync(p))
if (envPath) {
  dotenv.config({ path: envPath })
}
