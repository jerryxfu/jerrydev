import React from "react";
import "./NotFoundPage.scss";
import Footer from "../../components/Footer/Footer.tsx";

export default function NotFoundPage() {
    return (
        <div className="notfound flash-bg-r">
            <div className="notfound_content">
                <h1>404 - Page not found and it's probably your fault.</h1>
            </div>
            <div className="notfound_footer">
                <Footer />
            </div>
        </div>
    );
};
