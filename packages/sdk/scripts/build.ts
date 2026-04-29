#!/usr/bin/env bun
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs/promises"
import { $ } from "bun"
import { createClient } from "@hey-api/openapi-ts"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

await $`rm -f openapi.json`
const generateOutput = await $`bun generate`.cwd(path.resolve(dir, "../app")).text()
const openapiStartIndex = generateOutput.search(/\{\s*"openapi"\s*:/)
if (openapiStartIndex < 0) {
  throw new Error("Failed to parse OpenAPI JSON from app generate output")
}
await fs.writeFile(path.join(dir, "openapi.json"), generateOutput.slice(openapiStartIndex))

await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "OpencodeClient",
      exportFromIndex: false,
      auth: false,
      paramsStructure: "flat",
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:4096",
    },
  ],
})

await $`bun prettier --write src/gen`
await $`rm -rf dist`
await $`bun tsc -p tsconfig.build.json`
