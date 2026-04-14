import {lazy, type ReactNode, StrictMode, Suspense} from "react";
import {createRoot} from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

import "./index.scss";
import HomePage from "./pages/HomePage/HomePage.tsx";
import {ThemeProvider} from "./context/ThemeContext.tsx";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

const CountdownPage = lazy(() => import("./pages/CountdownPage/CountdownPage.tsx"));
const ElementsPage = lazy(() => import("./pages/ElementsPage/ElementsPage.tsx"));
const Waveform = lazy(() => import("./pages/cheatsheet/Waveform.tsx"));
const Mailman = lazy(() => import("./pages/cheatsheet/Mailman.tsx"));
const SuperIcu = lazy(() => import("./pages/supericu/SuperICU.tsx"));
const Conditioner = lazy(() => import("./pages/conditioner/Conditioner.tsx"));
const Scheduler = lazy(() => import("./pages/scheduler/Scheduler.tsx"));

const LOCAL_STORAGE_VERSION = "v1";

if (localStorage.getItem("app-version") !== LOCAL_STORAGE_VERSION) {
    localStorage.clear();
    localStorage.setItem("app-version", LOCAL_STORAGE_VERSION);
}

export const isDev = import.meta.env.MODE === "development";
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
        path: "/countdown",
        element: renderLazy(<CountdownPage />)
    },
    {
        path: "/elements",
        element: renderLazy(<ElementsPage />)
    },
    {
        path: "/supericu",
        element: renderLazy(<SuperIcu />)
    },
    {
        path: "/conditioner",
        element: renderLazy(<Conditioner />)
    },
    {
        path: "/scheduler",
        element: renderLazy(<Scheduler />)
    },
    {
        path: "/cheatsheet/waveform",
        element: renderLazy(<Waveform />)
    },
    {
        path: "/cheatsheet/mailman",
        element: renderLazy(<Mailman />)
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
            {/*<AuthProvider>*/}
            <ThemeProvider>
                <RouterProvider router={router} />
            </ThemeProvider>
            {/*</AuthProvider>*/}
        </ErrorBoundary>
    </StrictMode>
);