/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_APP_TITLE?: string;
    readonly VITE_ENABLE_ANALYTICS?: string;
}

// Set by vite.config.ts (define) for the footer's colophon: the short commit hash, and when the build ran (ISO).
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;