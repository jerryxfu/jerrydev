import {lazy, type ReactNode, StrictMode, Suspense} from "react";
import {createRoot} from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {HelmetProvider} from "react-helmet-async";

import "@fontsource-variable/outfit/index.css";
import "./index.scss";
import HomePage from "./pages/HomePage/HomePage.tsx";
import {ThemeProvider} from "./context/ThemeContext.tsx";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

const LazyExpedite = lazy(() => import("./pages/ExpeditePage/Expedite.tsx"));
const LazyElementsPage = lazy(() => import("./pages/ElementsPage/ElementsPage.tsx"));
const LazyWaveform = lazy(() => import("./pages/cheatsheet/Waveform.tsx"));
const LazySuperIcu = lazy(() => import("./pages/supericu/SuperICU.tsx"));
const LazyScheduler = lazy(() => import("./pages/scheduler/Scheduler.tsx"));
const LazyRendezvous = lazy(() => import("./pages/rendezvous/Rendezvous.tsx"));

const LOCAL_STORAGE_VERSION = "v1.0";

if (localStorage.getItem("app-version") !== LOCAL_STORAGE_VERSION) {
    localStorage.clear();
    localStorage.setItem("app-version", LOCAL_STORAGE_VERSION);
}

export const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ??
    (isDev ? "http://localhost:3001" : "https://api.jerryxf.net");

const renderLazy = (element: ReactNode) => (
    <Suspense fallback={null}>
        {element}
    </Suspense>
);

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />
    },
    {
        path: "/expedite",
        element: renderLazy(<LazyExpedite />)
    },
    {
        path: "/scheduler",
        element: renderLazy(<LazyScheduler />)
    },
    {
        path: "/rendezvous",
        element: renderLazy(<LazyRendezvous />)
    },
    {
        path: "/supericu",
        element: renderLazy(<LazySuperIcu />)
    },
    {
        path: "/elements",
        element: renderLazy(<LazyElementsPage />)
    },
    {
        path: "/cheatsheet/waveform",
        element: renderLazy(<LazyWaveform />)
    },
    {
        path: "*",
        element: <NotFoundPage />
    }
]);

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Root element not found");
}
const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <ErrorBoundary>
            <HelmetProvider>
                <ThemeProvider>
                    <RouterProvider router={router} />
                </ThemeProvider>
            </HelmetProvider>
        </ErrorBoundary>
    </StrictMode>
);