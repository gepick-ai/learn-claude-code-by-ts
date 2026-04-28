#!/usr/bin/env bun
import { fileURLToPath } from "node:url"
import path from "node:path"
import { $ } from "bun"
import { createClient } from "@hey-api/openapi-ts"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

await $`rm -f openapi.json`
await $`bun run generate > ${dir}/openapi.json`.cwd(path.resolve(dir, "../app"))

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
await $`bun tsc`