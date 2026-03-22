/// <reference types="vite/client" />

declare module '*?url' {
  const src: string
  export default src
}

interface ImportMetaEnv {
  readonly VITE_AUTH_USERNAME?: string
  readonly VITE_AUTH_PASSWORD?: string
  readonly VITE_KIOSK_SIDECAR_ORIGIN?: string
  readonly VITE_DEVICE_AGENT_ORIGIN?: string
}

