/// <reference types="vite/client" />

declare module '*?url' {
  const src: string
  export default src
}

interface ImportMetaEnv {
  readonly VITE_AUTH_USERNAME?: string
  readonly VITE_AUTH_PASSWORD?: string
  // Add other env variables here as needed
}

