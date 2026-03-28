/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APPS_SCRIPT_URL?: string;
  readonly VITE_SHEET_CSV_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}