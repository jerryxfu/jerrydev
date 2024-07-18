import React, {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import "./index.scss";

gsap.registerPlugin(ScrollTrigger);

const router = createBrowserRouter([
    {
        path: "/",
        element: <>
            <p>Major refactor in progress. Website should be back up in a few days.</p>
        </>
    },
    {
        path: "/bday",
        element: <>
        </>
    },
    {
        path: "/countdown",
        element: <>
        </>
    },
    {
        path: "/elements",
        element: <>
        </>
    },
    {
        path: "/unix",
        element: <>
        </>
    }
]);

const rootElement = document.getElementById("root");
// @ts-ignore
const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);
