/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_GITLAB_URL: string
  readonly VITE_GITLAB_TOKEN: string
  readonly VITE_GITLAB_PROJECT_ID: string
  readonly VITE_GITLAB_API_VERSION: string
  readonly VITE_HTTP_PROXY: string
  readonly VITE_HTTPS_PROXY: string
  readonly VITE_NO_PROXY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}