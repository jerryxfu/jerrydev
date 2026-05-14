import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// use rollup-plugin-visualizer

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (!id.includes("node_modules")) return;
                    if (
                        id.includes("/react/") ||
                        id.includes("/react-dom/") ||
                        id.includes("/react-router") ||
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
                },
            },
        },
    },
});