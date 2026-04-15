import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes("node_modules")) {
                        if (id.includes("react")) {
                            return "react";
                        } else if (id.includes("@mui") || id.includes("@emotion")) {
                            return "ui";
                        } else if (id.includes("gsap") || id.includes("framer-motion") || id.includes("split-type")) {
                            return "animation";
                        } else if (id.includes("d3") || id.includes("plotly") || id.includes("papaparse") || id.includes("smoothie")) {
                            return "charts";
                        }
                    }
                }
            }
        }
    }
});