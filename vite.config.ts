import {fileURLToPath, URL} from "node:url";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {VitePWA} from "vite-plugin-pwa";

// use rollup-plugin-visualizer

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    plugins: [
        react(),
        VitePWA({
            // Not "autoUpdate": that sets skipWaiting + clientsClaim, so a new worker activates under a page still running the previous build,
            // and Workbox then drops every precached asset missing from the new manifest (the live page's lazy chunks 404 mid-session).
            // Waiting keeps each page consistent with the build it loaded with.
            registerType: "prompt",
            injectRegister: "auto",
            // Served from public/, so not fingerprinted and not caught by globPatterns.
            includeAssets: ["favicon.ico", "favicon.jpeg", "favicon16.png", "favicon32.png", "apple-touch-icon.png"],
            manifest: {
                name: "jerryxf",
                short_name: "jerryxf",
                description: "Hi there, I'm Jerry.",
                start_url: "/",
                display: "standalone",
                background_color: "#fbfaf9",
                theme_color: "#fbfaf9",
                icons: [
                    {src: "/android-chrome192.png", sizes: "192x192", type: "image/png"},
                    {src: "/android-chrome512.png", sizes: "512x512", type: "image/png"},
                    // Android crops any icon it can't identify as maskable, so the same
                    // art is offered again with padding-aware placement.
                    {src: "/android-chrome512.png", sizes: "512x512", type: "image/png", purpose: "maskable"}
                ]
            },
            workbox: {
                // Code, styles, markup and fonts only — roughly 180 kB gzipped for the
                // whole app. Project images and the video are deliberately absent; they
                // are ~1 MB and are picked up by runtimeCaching once actually viewed.
                globPatterns: ["**/*.{js,css,html,woff2}"],
                cleanupOutdatedCaches: true,
                // Offline deep links land on the shell, which then routes client-side.
                // Online this never fires: Cloudflare Pages already serves index.html
                // for unmatched paths.
                navigateFallback: "/index.html",
                runtimeCaching: [
                    {
                        urlPattern: ({request}) => request.destination === "image" || request.destination === "video",
                        handler: "CacheFirst",
                        options: {
                            cacheName: "media",
                            expiration: {maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30},
                            // 0 keeps opaque cross-origin responses cacheable.
                            cacheableResponse: {statuses: [0, 200]},
                            rangeRequests: true
                        }
                    }
                ]
            }
        })
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string): string | undefined {
                    if (!id.includes("node_modules")) return undefined;
                    if (
                        id.includes("/react/") ||
                        id.includes("/react-dom/") ||
                        id.includes("/wouter/") ||
                        id.includes("/scheduler/")
                    ) {
                        return "react-vendor";
                    }

                    if (
                        id.includes("/gsap/") ||
                        id.includes("/@gsap/") ||
                        id.includes("/split-type/")
                    ) {
                        return "gsap-vendor";
                    }

                    return undefined;
                },
            },
        },
    },
});