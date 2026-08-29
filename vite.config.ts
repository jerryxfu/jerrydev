import {fileURLToPath, URL} from "node:url";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import {VitePWA} from "vite-plugin-pwa";

// use rollup-plugin-visualizer

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    plugins: [
        // enforce: "pre" is required, not cosmetic. Without it the React plugin
        // reaches .mdx first, fails to parse it as JSX, and the build dies with
        // an error that points nowhere near the real cause.
        {
            enforce: "pre",
            ...mdx({
                // remark-math tokenises $...$ before MDX's expression parser can claim the braces inside \frac{}{},
                // which is why LaTeX survives in MDX at all. rehype-katex then renders those nodes to markup at build.
                // MDX is CommonMark only, so tables, strikethrough, footnotes and task lists need remark-gfm.
                remarkPlugins: [remarkGfm, remarkMath],
                // Order matters twice over. rehype-slug has to run before autolink-headings, which
                // has nothing to point at until the ids exist; and both run before Shiki, which
                // rewrites code subtrees they have no business walking.
                rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, {
                    // "append", not "wrap": wrapping turns the whole heading into a link, so every
                    // heading in a post renders underlined and steals the pointer.
                    behavior: "append",
                    properties: {className: "heading_anchor", tabIndex: -1, "aria-hidden": "true"},
                    content: {type: "text", value: "¶"},
                }], rehypeKatex, [rehypeShiki, {
                    // Dual themes: the light one is baked in as inline styles and
                    // the dark one ships as --shiki-dark custom properties, which
                    // PostPage.scss swaps in for the dark themes. All of this is
                    // build time — no highlighter reaches the browser.
                    themes: {light: "github-light", dark: "github-dark"},
                    // Explicit list on purpose. Left open, Shiki loads every
                    // grammar it has and build time balloons. Adding one here is
                    // free at runtime and costs only the build.
                    // "text" is the deliberate no-highlight lang: the guides are full of terminal
                    // output and plain listings, and a bare fence renders as an unstyled block that
                    // looks like a mistake rather than a choice. Shiki special-cases it, so unlike
                    // every other entry here it costs no grammar. There is no `gitignore` grammar in
                    // the bundle at all — that one is written as `bash`, which gets the # comments right.
                    langs: ["ts", "tsx", "js", "jsx", "python", "bash", "json", "scss", "java", "latex", "text"],
                }]],
            }),
        },
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
                // Only the shell and fonts. Hashed JS and CSS moved to runtimeCaching below, where cacheWillUpdate can reject a host's HTML fallback.
                // The precache has no such hook: it accepts any 200 and, since PrecacheStrategy checks the cache before fetching, a bad entry is never re-fetched and survives every later deploy.
                globPatterns: ["**/*.{html,woff2}"],
                // KaTeX ships 20 woff2 faces and the glob above would precache every one, so a visitor who only ever
                // sees the home page still pays ~340KB on service worker install for maths they never read. They are
                // excluded here and picked up cache-first on demand by the font rule in runtimeCaching instead.
                globIgnores: ["**/KaTeX_*"],
                cleanupOutdatedCaches: true,
                // Gives every precache entry a revision, which switches its install fetch to cache: "reload".
                // Hashed entries otherwise install with cache: "default" and can be answered from a browser HTTP cache still holding an HTML fallback from an earlier miss.
                dontCacheBustURLsMatching: /^$/,
                // Both nulls exist to get navigations out of the precache, which is what
                // made returning visitors boot the previous build's HTML. directoryIndex
                // stops "/" resolving to the precached index.html, and navigateFallback
                // suppresses the NavigationRoute the plugin emits by default — that route
                // is registered ahead of runtimeCaching and would win every navigation.
                // index.html stays precached; precacheFallback below serves it offline.
                directoryIndex: null,
                navigateFallback: null,
                runtimeCaching: [
                    {
                        // HTML from the network so the shell always matches the deployment
                        // it references. Falls back to the precached shell when offline or
                        // when the network is slower than the timeout.
                        urlPattern: ({request}) => request.mode === "navigate",
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "html",
                            networkTimeoutSeconds: 3,
                            cacheableResponse: {statuses: [200]},
                            precacheFallback: {fallbackURL: "/index.html"}
                        }
                    },
                    {
                        // The KaTeX faces dropped from the precache. Hashed and immutable like any other asset, so
                        // cache-first is right; they just shouldn't be fetched until a post actually renders maths.
                        urlPattern: ({request, sameOrigin}) => sameOrigin && request.destination === "font",
                        handler: "CacheFirst",
                        options: {
                            cacheName: "fonts",
                            expiration: {maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365},
                            cacheableResponse: {statuses: [200]}
                        }
                    },
                    {
                        // Hashed filenames are immutable, so cache-first is safe.
                        // When a host answers a missing asset with its SPA fallback (200 text/html), this refuses to store it, and the reload in main.tsx recovers the page.
                        urlPattern: ({request, sameOrigin}) =>
                            sameOrigin && (request.destination === "script" || request.destination === "style"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "assets",
                            // Bypasses the browser HTTP cache on every miss, so an HTML fallback
                            // cached earlier can never be fed back to the worker. Native strategy
                            // option, passed straight to fetch() for non-navigation requests.
                            fetchOptions: {cache: "reload"},
                            expiration: {maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30},
                            cacheableResponse: {statuses: [200]},
                            plugins: [{
                                cacheWillUpdate: async ({response}) =>
                                    response.headers.get("content-type")?.startsWith("text/html") ? null : response
                            }]
                        }
                    },
                    {
                        urlPattern: ({request}) => request.destination === "image" || request.destination === "video",
                        handler: "CacheFirst",
                        options: {
                            cacheName: "media",
                            expiration: {maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30},
                            // 0 keeps opaque cross-origin responses cacheable.
                            cacheableResponse: {statuses: [0, 200]},
                            rangeRequests: true,
                            // A missing asset gets Cloudflare's SPA fallback: index.html
                            // with status 200. That passes the status filter above, so
                            // without this an HTML body would be stored as the image and
                            // pinned for 30 days. Opaque responses carry no headers, so
                            // they fall through and stay cacheable.
                            plugins: [{
                                cacheWillUpdate: async ({response}) =>
                                    response.headers.get("content-type")?.startsWith("text/html") ? null : response
                            }]
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