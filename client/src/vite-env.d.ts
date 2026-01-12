/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISABLE_DEVTOOLS: string;
  // Add other VITE_ env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
