import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import gsap from "gsap";
import {CustomEase, ScrollTrigger, TextPlugin} from "gsap/all";

import "./index.scss";
import HomePage from "./pages/HomePage/HomePage.tsx";
import BdayPage from "./pages/BdayPage/BdayPage.tsx";
import CountdownPage from "./pages/CountdownPage/CountdownPage.tsx";
import ElementsPage from "./pages/ElementsPage/ElementsPage.tsx";
import UnixPage from "./pages/UnixPage/UnixPage.tsx";
import {ThemeProvider} from "./context/ThemeContext.tsx";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

gsap.registerPlugin(CustomEase, ScrollTrigger, TextPlugin);

CustomEase.create("nativeEase", "0.250, 0.100, 0.250, 1.000");
CustomEase.create("customEaseOut", "0.250, 0.100, 0.580, 1.000");

gsap.defaults({
    ease: "nativeEase"
});

export const isDev = import.meta.env.MODE === "development";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ??
    (isDev ? "http://localhost:3001" : "https://api.jerryxf.net");

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />
    },
    {
        path: "/bday",
        element: <BdayPage />
    },
    {
        path: "/countdown",
        element: <CountdownPage />
    },
    {
        path: "/elements",
        element: <ElementsPage />
    },
    {
        path: "/unix",
        element: <UnixPage />
    },
    {
        path: "*",
        element: <NotFoundPage />
    }
]);

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
    <StrictMode>
        <ErrorBoundary>
            {/*<AuthProvider>*/}
            <ThemeProvider>
                <RouterProvider router={router} />
            </ThemeProvider>
            {/*</AuthProvider>*/}
        </ErrorBoundary>
    </StrictMode>
);