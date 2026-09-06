import {Helmet} from "react-helmet-async";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
import Policy from "./privacy.mdx";
import "@/assets/styles/prose.scss";
import "./Privacy.scss";

// The MDX lives beside this file rather than under BlogPage/posts/, which is what keeps it out of the
// import.meta.glob in posts.tsx and off /blog. It is prose, not a post: no manifest entry, no topic, no date.
export default function Privacy() {
    return (
        <div className="legal">
            <Helmet>
                <title>TechNexus privacy policy | jerryxf</title>
                <meta name="description" content="How the TechNexus app handles your data." />
                <link rel="canonical" href="https://jerryxf.net/technexus/privacy" />
            </Helmet>

            {/* Unlike a post, this page keeps the navbar: it is a leaf reached from an app store listing or the
                app's About screen, so a reader arriving here has no other way back into the site. */}
            <Navbar isShrunk={true} stagger={false} animate={false} />

            <main className="legal_container">
                <article className="prose"><Policy /></article>
            </main>
            <Footer />
        </div>
    );
}
