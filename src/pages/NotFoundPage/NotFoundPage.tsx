import React from "react";
import "./NotFoundPage.scss";
import Footer from "../../components/Footer/Footer.tsx";
import Navbar from "@/components/Nav/Navbar.tsx";

export default function NotFoundPage() {
    return (
        <div className="notfound">
            <Navbar isShrunk={true} />

            <main id="main" className="notfound_content">
                <h1>HTTP status code 404 — Page not found; it's probably your fault.</h1>
                <a href="/">&rsaquo; Return to main page</a>
            </main>
            <div className="notfound_footer">
                <Footer />
            </div>
        </div>
    );
};
