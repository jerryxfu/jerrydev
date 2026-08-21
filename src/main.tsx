import {lazy, type ReactNode, StrictMode, Suspense, useEffect} from "react";
import {createRoot} from "react-dom/client";
import {Route, Switch, useLocation} from "wouter";
import {HelmetProvider} from "react-helmet-async";

import "@fontsource-variable/outfit/index.css";
import "./index.scss";
import HomePage from "./pages/HomePage/HomePage.tsx";
import {ThemeProvider} from "./context/ThemeContext.tsx";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import OfflineToast from "./components/OfflineToast/OfflineToast.tsx";

// A deploy replaces every hashed filename, so a tab opened against an older build can ask for a chunk that no longer exists.
// Vite fires this instead of throwing, and a reload lands on the current build.
// Timestamped so a deploy that is actually broken surfaces the error instead of reloading forever.
const PRELOAD_RELOAD_KEY = "preload-reloaded-at";

window.addEventListener("vite:preloadError", (event) => {
    if (Date.now() - Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0) < 10_000) return;

    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
    event.preventDefault();
    window.location.reload();
});

const LazyExpedite = lazy(() => import("./pages/ExpeditePage/Expedite.tsx"));
const LazyElementsPage = lazy(() => import("./pages/ElementsPage/ElementsPage.tsx"));
const LazyWaveform = lazy(() => import("./pages/cheatsheet/Waveform.tsx"));
const LazySuperIcu = lazy(() => import("./pages/supericu/SuperICU.tsx"));
const LazyScheduler = lazy(() => import("./pages/scheduler/Scheduler.tsx"));
const LazyRendezvous = lazy(() => import("./pages/rendezvous/Rendezvous.tsx"));
const LazyTime = lazy(() => import("./pages/time/Time.tsx"));

const LOCAL_STORAGE_VERSION = "v1";

if (localStorage.getItem("app-version") !== LOCAL_STORAGE_VERSION) {
    localStorage.clear();
    localStorage.setItem("app-version", LOCAL_STORAGE_VERSION);
}

export const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ??
    (isDev ?
            "http://localhost:3001" // dev
            : "https://api.jerryxf.net" // prod
    );

// region this passes build, and does absolutely nothing. TypeScript hell.
type Rev<S extends string> = S extends `${infer H}${infer R}` ? `${Rev<R>}${H}` : "";
const seed = "void" as const;
type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const nothing = <const T extends string>(s: T): Proven<T> =>
    [...s].reverse().reverse().join("") as Proven<T>;
type Proven<S extends string> = Eq<Rev<Rev<S>>, S> extends true ? S : never;
void (nothing(seed) satisfies "void");
try {
    void (null as unknown as { z(): never })!.z();
} catch {
    label:
        //noinspection LoopStatementThatDoesntLoopJS
        for (
            // @ts-expect-error TS2873: This kind of expression is always falsy
            let i = +!void 0; i > 0; i--
        ) {
            // noinspection UnnecessaryLabelOnBreakStatementJS
            break label;
        }
}
// endregion

const renderLazy = (element: ReactNode) => (
    <Suspense fallback={null}>
        {element}
    </Suspense>
);

// Client-side navigation preserves scroll position, so a route change would
// otherwise land you partway down the new page. Skipped when the URL carries a
// hash, since that navigation is a full reload whose whole point is to scroll
// somewhere other than the top.
function ScrollToTop() {
    const [pathname] = useLocation();

    useEffect(() => {
        if (window.location.hash) return;
        window.scrollTo({top: 0, left: 0, behavior: "instant"});
    }, [pathname]);

    return null;
}

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
                    <ScrollToTop />
                    <OfflineToast />
                    <Switch>
                        <Route path="/"><HomePage /></Route>
                        <Route path="/expedite">{renderLazy(<LazyExpedite />)}</Route>
                        <Route path="/scheduler">{renderLazy(<LazyScheduler />)}</Route>
                        <Route path="/rendezvous">{renderLazy(<LazyRendezvous />)}</Route>
                        <Route path="/time">{renderLazy(<LazyTime />)}</Route>
                        <Route path="/supericu">{renderLazy(<LazySuperIcu />)}</Route>
                        <Route path="/elements">{renderLazy(<LazyElementsPage />)}</Route>
                        <Route path="/cheatsheet/waveform">{renderLazy(<LazyWaveform />)}</Route>
                        <Route><NotFoundPage /></Route>
                    </Switch>
                </ThemeProvider>
            </HelmetProvider>
        </ErrorBoundary>
    </StrictMode>
);