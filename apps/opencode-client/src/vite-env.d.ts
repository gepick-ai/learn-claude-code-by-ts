/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 仅开发：与 `OPENCODE_APP_ORIGIN` 同值时直连 API，避免 Vite 代理长流式请求异常。 */
  readonly VITE_OPENCODE_DEV_API_ORIGIN?: string
}
