import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import type { ProxyOptions } from "vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 与 `@gepick/app` 可复用长连接，减轻 dev 代理在流式/长请求时过早收尾导致的 `socket hang up` */
const gepickHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 50,
  maxFreeSockets: 20,
  timeout: 0,
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const target = env.GEPICK_APP_ORIGIN ?? "http://127.0.0.1:3000"

  const longTimeoutMs = 1_800_000

  /**
   * 仅 `timeout` / `proxyTimeout` 有时不会传到 node-http-proxy 的 socket 上，这里用 `configure` 再关一层时限。
   * 若仍 hang up，多半是对端 `@gepick/app` 主动断连或崩溃，需看后端日志。
   */
  const gepickProxy: ProxyOptions = {
    target,
    changeOrigin: true,
    agent: gepickHttpAgent,
    timeout: longTimeoutMs,
    proxyTimeout: longTimeoutMs,
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setTimeout(0)
        proxyReq.setHeader("Connection", "keep-alive")
      })
      proxy.on("proxyRes", (proxyRes) => {
        proxyRes.setTimeout(0)
      })
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
      proxy: {
        "^/session": gepickProxy,
        "^/sse": gepickProxy,
      },
    },
  }
})
