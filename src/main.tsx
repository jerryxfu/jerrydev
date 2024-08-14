import React, {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import "./index.scss";
import HomePage from "./pages/HomePage/HomePage.tsx";
import BdayPage from "./pages/BdayPage/BdayPage.tsx";
import CountdownPage from "./pages/CountdownPage/CountdownPage.tsx";
import ElementsPage from "./pages/ElementsPage/ElementsPage.tsx";
import UnixPage from "./pages/UnixPage/UnixPage.tsx";

gsap.registerPlugin(ScrollTrigger);

const router = createBrowserRouter([
    {
        path: "/",
        element: <>
            <HomePage />
            <br />
            <p>Major refactor in progress. Website should be back up in a few days.</p>
        </>
    },
    {
        path: "/bday",
        element: <>
            <BdayPage />
        </>
    },
    {
        path: "/countdown",
        element: <>
            <CountdownPage />
        </>
    },
    {
        path: "/elements",
        element: <>
            <ElementsPage />
        </>
    },
    {
        path: "/unix",
        element: <>
            <UnixPage />
        </>
    }
]);

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);
