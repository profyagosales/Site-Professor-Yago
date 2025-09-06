/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENABLE_SW?: '0' | '1';
  readonly VITE_DISABLE_SW?: '0' | '1';
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
