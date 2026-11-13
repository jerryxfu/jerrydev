import {type CSSProperties, useEffect, useState} from "react";
import {Link, useParams} from "wouter";
import Button from "@/components/Button/Button.tsx";
import {ApiError, countVisit, getLink} from "./api.ts";
import page, {REPORT_TO} from "./page.ts";
import "./Go.scss";

// How the page leaves for a link's destination: 0 at once, a number after that long (in ms, shown by the circle), null
// on a click on Go only. A delay guards less than a click: this can go to null the day links get abused.
const GO_AFTER_MS: number | null = 2000;

// The site's own pages need no warning: a Shortcut to a drop or to an event goes at once.
const OURS = new Set(["jerryxf.net", "www.jerryxf.net"]);

type State =
    | { at: "asking" }
    | { at: "going"; url: URL }                       // on its way: the circle fills
    | { at: "stayed"; url: URL }                      // "Stay here", or no delay: the full address, and Go
    | { at: "nowhere"; message: string; gone: boolean };

// Out to the destination. The visit is counted on the way, the destination isn't told where the visitor came from
// (rel="noreferrer", for a page that leaves by itself), and the address is replaced: Back from there doesn't land
// here, to go again.
function leave(name: string, url: URL): void {
    countVisit(name);
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.append(meta);
    window.location.replace(url.href);
}

// The wait, as a live room's file going up: a small circle, here filling, and the seconds left beside it.
function Wait({ms}: { ms: number }) {
    const [left, setLeft] = useState(ms);

    useEffect(() => {
        const end = performance.now() + ms;
        const tick = window.setInterval(() => setLeft(Math.max(0, end - performance.now())), 200);
        return () => window.clearInterval(tick);
    }, [ms]);

    return (
        <span className="go_wait">
            <svg className="go_ring" viewBox="0 0 20 20" aria-hidden style={{"--go-ms": `${ms}ms`} as CSSProperties}>
                <circle cx="10" cy="10" r="8" />
                <circle className="go_ring-fill" cx="10" cy="10" r="8" pathLength="100" />
            </svg>
            <span className="go_seconds">{Math.max(1, Math.ceil(left / 1000))} s</span>
        </span>
    );
}

/** The page in between (/s/party): it asks where the link goes, shows it, and goes there by itself. */
export default function Go() {
    const name = (useParams<{ name?: string }>().name ?? "").toLowerCase();
    const [state, setState] = useState<State>({at: "asking"});

    useEffect(() => {
        let wanted = true;
        getLink(name).then(
            (link) => {
                if (!wanted) return;
                const url = new URL(link.url);
                if (GO_AFTER_MS === 0 || OURS.has(url.hostname)) leave(name, url);
                else setState({at: GO_AFTER_MS === null ? "stayed" : "going", url});
            },
            (err: unknown) => {
                if (!wanted) return;
                const gone = err instanceof ApiError && err.status === 404;
                setState({
                    at: "nowhere", gone,
                    message: gone ? "This link doesn't exist, or it has ended." : err instanceof Error ? err.message : "Something went wrong. Try again.",
                });
            },
        );
        return () => {
            wanted = false;
        };
    }, [name]);

    useEffect(() => {
        if (state.at !== "going" || GO_AFTER_MS === null) return;
        const timer = window.setTimeout(() => leave(name, state.url), GO_AFTER_MS);
        return () => window.clearTimeout(timer);
    }, [state, name]);

    return (
        <main className="go">
            {state.at === "going" && (
                <>
                    <p className="go_line">
                        {GO_AFTER_MS !== null && <Wait ms={GO_AFTER_MS} />}
                        Taking you to
                    </p>
                    <p className="go_host">{state.url.hostname}</p>
                    <button className="go_stay" onClick={() => setState({at: "stayed", url: state.url})}>Stay here</button>
                </>
            )}

            {state.at === "stayed" && (
                <>
                    <p className="go_line">This link goes to</p>
                    <p className="go_host">{state.url.hostname}</p>
                    <p className="go_address">{state.url.href}</p>
                    <Button variant="main" onClick={() => leave(name, state.url)}>Go</Button>
                    <p className="go_report">
                        Something wrong with this link? <a href={`mailto:${REPORT_TO}?subject=${encodeURIComponent(`Shortcut ${name}`)}`}>Report it</a>.
                    </p>
                </>
            )}

            {state.at === "nowhere" && (
                <>
                    <p className="go_line">{state.message}</p>
                    {state.gone
                        ? <Link className="go_stay" href={page.path}>Make a short link</Link>
                        : <button className="go_stay" onClick={() => window.location.reload()}>Try again</button>}
                </>
            )}
        </main>
    );
}
