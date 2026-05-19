import React from "react";
import "./NotFoundPage.scss";
import Footer from "../../components/Footer/Footer.tsx";

export default function NotFoundPage() {
    return (
        <div className="notfound">
            <div className="notfound_content">
                <h1>HTTP status code 404 — Page not found; it's probably your fault.</h1>
                <a href="/">&rsaquo; Return to main page</a>
            </div>
            <div className="notfound_footer">
                <Footer />
            </div>
        </div>
    );
};
