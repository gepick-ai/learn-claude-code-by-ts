/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 仅开发：与 `GEPICK_APP_ORIGIN` 同值时直连 API，避免 Vite 代理长流式请求异常。 */
  readonly VITE_GEPICK_DEV_API_ORIGIN?: string
}
