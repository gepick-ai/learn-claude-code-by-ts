import { generateSpecs } from "hono-openapi"
import { buildApp } from "./server/app"

const specs = await generateSpecs(buildApp(), {
  documentation: {
    info: {
      title: "gepick",
      version: "0.0.3",
      description: "gepick api",
    },
    openapi: "3.1.1",
  },
})

await new Promise<void>((resolve, reject) => {
  process.stdout.write(JSON.stringify(specs, null, 2), (err) => {
    if (err) reject(err)
    else resolve()
  })
})
