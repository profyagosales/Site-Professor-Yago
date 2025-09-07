/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_URL?: string
  readonly VITE_VIRT_PDF?: string
  readonly VITE_USE_COOKIE_AUTH?: string
  readonly VITE_USE_RICH_ANNOS?: string
  readonly VITE_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
