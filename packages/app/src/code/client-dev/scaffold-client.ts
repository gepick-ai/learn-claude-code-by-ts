import fs from "node:fs"
import fsPromises from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(MODULE_DIR, "templates", "default-client")
const DIST_INDEX_PLACEHOLDER = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview Not Built</title>
  </head>
  <body style="font-family: sans-serif; padding: 16px;">
    <h3>Preview is not built yet</h3>
    <p>Please run <code>npm install</code> and <code>npm run build</code> in <code>client/</code>.</p>
  </body>
</html>
`

async function copyDir(src: string, dest: string): Promise<void> {
  await fsPromises.mkdir(dest, { recursive: true })
  const entries = await fsPromises.readdir(src, { withFileTypes: true })
  for (const e of entries) {
    const from = path.join(src, e.name)
    const to = path.join(dest, e.name)
    if (e.isDirectory()) {
      await copyDir(from, to)
    } else {
      await fsPromises.copyFile(from, to)
    }
  }
}

async function ensureDistPreviewPlaceholder(clientDir: string): Promise<void> {
  const distDir = path.join(clientDir, "dist")
  const distIndex = path.join(distDir, "index.html")
  if (fs.existsSync(distIndex)) {
    return
  }
  await fsPromises.mkdir(distDir, { recursive: true })
  await fsPromises.writeFile(distIndex, DIST_INDEX_PLACEHOLDER, "utf8")
}

/**
 * 若 `client/package.json` 已存在则 **不覆盖**；否则将基准 Vite+React+Tailwind 模板整包复制到 `client/`（v4，幂等）。
 */
export async function ensureClientProjectTemplate(absoluteProjectDir: string): Promise<void> {
  const clientDir = path.join(absoluteProjectDir, "client")
  const marker = path.join(clientDir, "package.json")
  if (!fs.existsSync(marker)) {
    await copyDir(TEMPLATE_DIR, clientDir)
  }
  await ensureDistPreviewPlaceholder(clientDir)
}
