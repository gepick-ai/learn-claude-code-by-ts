import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const target = env.OPENCODE_APP_ORIGIN ?? "http://127.0.0.1:3000"
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
      proxy: {
        "^/session": { target, changeOrigin: true },
        "^/sse": { target, changeOrigin: true },
      },
    },
  }
})
