import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ["react", "react-dom", "react-router-dom"],
                    ui: ["@mui/joy", "@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
                    animation: ["gsap", "framer-motion", "split-type"],
                    charts: ["d3", "plotly.js", "react-plotly.js", "papaparse", "smoothie"]
                }
            }
        }
    }
});