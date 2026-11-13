import {type FormEvent, useEffect, useRef, useState} from "react";
import {Check, Copy, Trash2} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {useLocation, useSearch} from "wouter";
import Navbar from "@/components/Nav/Navbar.tsx";
import Button from "@/components/Button/Button.tsx";
import useAutoFocus from "@/hooks/useAutoFocus.ts";
import {copyText, fromNow} from "@/utils.ts";
import {ApiError, deleteLink, getLink, getStats, makeLink} from "./api.ts";
import {forgetLink, keepLink, type MyLink, readLinks} from "./links.ts";
import page, {hostOf, linkPath, REPORT_TO} from "./page.ts";
import "./Shortcut.scss";

// How long a link lasts, in days: 30 unless another is picked.
const LENGTHS = [1, 7, 30];

// A link as it's shared (https://jerryxf.net/s/party), and as it's read (jerryxf.net/s/party).
const shortUrl = (name: string) => window.location.origin + linkPath(name);
const shortText = (name: string) => window.location.host + linkPath(name);

const endsIn = (link: MyLink) => fromNow(Temporal.Instant.from(link.expiresAt).epochMilliseconds - Date.now());

// Copy, which says so for a moment once it's really copied.
function useCopied(): [string | null, (key: string, text: string) => void] {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = (key: string, text: string) => {
        void copyText(text).then((ok) => {
            if (!ok) return;
            setCopied(key);
            window.setTimeout(() => setCopied((now) => (now === key ? null : now)), 1500);
        });
    };
    return [copied, copy];
}

// The form: the long link, a name for the short one (or none: a random code), how long it lasts.
function MakeForm({asked, onMade}: { asked: string; onMade: (name: string, link: MyLink) => void }) {
    const [url, setUrl] = useState(asked);
    const [name, setName] = useState("");
    const [days, setDays] = useState(30);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const field = useRef<HTMLInputElement>(null);
    useAutoFocus(field);

    const make = async (e: FormEvent) => {
        e.preventDefault();
        const typed = url.trim();
        if (!typed || busy) return;
        setBusy(true);
        setError(null);
        try {
            // "example.com/page", as people type it.
            const link = await makeLink(/^[a-z][a-z0-9+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`, name, days);
            setUrl("");
            setName("");
            onMade(link.name, {token: link.token, url: link.url, at: Temporal.Now.instant().toString(), expiresAt: link.expiresAt});
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't make the link. Try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="sc_form" onSubmit={make}>
            <div className="sc_field">
                <input
                    ref={field}
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Paste a long link"
                    aria-label="The long link"
                    maxLength={2000}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <Button variant="main" type="submit" busy={busy} className="sc_shorten">Shorten</Button>
            </div>

            <div className="sc_options">
                <label className="sc_name">
                    <span aria-hidden>/s/</span>
                    <input
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="pick-a-name"
                        aria-label="A name for the short link. Empty for a random one."
                        maxLength={32}
                        value={name}
                        // As the API takes it: a to z, digits and hyphens. A space typed becomes a hyphen.
                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                    />
                </label>
                <div className="sc_lengths" role="radiogroup" aria-label="How long the link lasts">
                    {LENGTHS.map((length) => (
                        <button
                            key={length} type="button" role="radio" aria-checked={days === length}
                            className="sc_length" onClick={() => setDays(length)}
                        >
                            {length} day{length === 1 ? "" : "s"}
                        </button>
                    ))}
                </div>
            </div>

            <p className="sc_note">
                {name ? "A name is easy to guess. Don't name a link that goes somewhere private." : "No name? The link gets a random one."}
            </p>
            {error && <p className="sc_error" role="alert">{error}</p>}
        </form>
    );
}

// The link just made, on its label: to copy, or to scan.
function Label({name, link}: { name: string; link: MyLink }) {
    const [copied, copy] = useCopied();
    return (
        <section className="sc_label" aria-label="Your short link">
            <div className="sc_label-text">
                <p className="sc_label-title">Your short link</p>
                <p className="sc_label-link">{shortText(name)}</p>
                <div className="sc_label-foot">
                    <button className="sc_pill" onClick={() => copy(name, shortUrl(name))}>
                        {copied === name ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                        {copied === name ? "Copied" : "Copy"}
                    </button>
                    <span>Ends {endsIn(link)}</span>
                </div>
            </div>
            {/* Dark on white in every theme, as Expedite's: some scanners can't read a light code on a dark ground. */}
            <QRCodeSVG
                className="sc_qr" value={shortUrl(name)} size={112} marginSize={2}
                bgColor="#ffffff" fgColor="#1a1a1a" title="QR code of the short link"
            />
        </section>
    );
}

// The links made in this browser: where each goes, its visits, its end, and Delete.
function MyLinks({links, visits, onDeleted}: {
    links: Record<string, MyLink>; visits: Record<string, number>; onDeleted: (name: string) => void;
}) {
    const [copied, copy] = useCopied();
    // The link whose Delete was pressed: it asks first, since the link stops for everyone who has it.
    const [asking, setAsking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const remove = async (name: string, link: MyLink) => {
        setError(null);
        try {
            await deleteLink(name, link.token);
        } catch (err) {
            // Already gone (it ended, or was deleted from elsewhere) is as good as deleted.
            if (!(err instanceof ApiError && err.status === 404)) {
                setError(err instanceof Error ? err.message : "The link couldn't be deleted. Try again.");
                return;
            }
        }
        setAsking(null);
        onDeleted(name);
    };

    // The newest first.
    const rows = Object.entries(links).sort(([, a], [, b]) => b.at.localeCompare(a.at));

    return (
        <section className="sc_mine">
            <h2>Your links</h2>
            <ul>
                {rows.map(([name, link]) => (
                    <li key={name} className="sc_row">
                        <div className="sc_row-link">
                            <a href={linkPath(name)} target="_blank" rel="noreferrer">{linkPath(name)}</a>
                            <span title={link.url}>{hostOf(link.url)}</span>
                        </div>
                        {asking === name ? (
                            <div className="sc_row-ask">
                                <span>Delete it for everyone?</span>
                                <button className="sc_pill sc_pill--danger" onClick={() => void remove(name, link)}>Delete</button>
                                <button className="sc_pill" onClick={() => setAsking(null)}>Keep</button>
                            </div>
                        ) : (
                            <div className="sc_row-foot">
                                <span>
                                    {visits[name] != null && `${visits[name]} visit${visits[name] === 1 ? "" : "s"} · `}
                                    ends {endsIn(link)}
                                </span>
                                <button className="sc_round" aria-label={`Copy ${linkPath(name)}`} onClick={() => copy(name, shortUrl(name))}>
                                    {copied === name ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                                </button>
                                <button className="sc_round" aria-label={`Delete ${linkPath(name)}`} onClick={() => setAsking(name)}>
                                    <Trash2 size={15} aria-hidden />
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            {error && <p className="sc_error" role="alert">{error}</p>}
        </section>
    );
}

/** Shortcut (/shortcut): a long link in, a short one out. The links themselves open on Go.tsx (/s/party). */
export default function Shortcut() {
    const [, navigate] = useLocation();
    // A link to shorten, from the palette's "Shorten this link" (/shortcut?url=...): it's in the field as the page opens.
    const asked = new URLSearchParams(useSearch()).get("url") ?? "";
    const [links, setLinks] = useState(readLinks);
    const [visits, setVisits] = useState<Record<string, number>>({});
    const [made, setMade] = useState<string | null>(null);
    const [stats, setStats] = useState<{ activeLinks: number; visits: number } | null>(null);

    // The footer's numbers, as Expedite's and Rendezvous's: again once a link is made or deleted.
    useEffect(() => {
        getStats().then(setStats, () => { /* no numbers, no line */
        });
    }, [links]);

    // Each link's visits, as the page opens. One that's gone (deleted from elsewhere) leaves the list.
    useEffect(() => {
        for (const name of Object.keys(readLinks())) {
            getLink(name).then(
                (link) => setVisits((known) => ({...known, [name]: link.visits})),
                (err: unknown) => {
                    if (!(err instanceof ApiError && err.status === 404)) return;
                    forgetLink(name);
                    setLinks(readLinks());
                },
            );
        }
    }, []);

    const onMade = (name: string, link: MyLink) => {
        keepLink(name, link);
        setLinks({...readLinks(), [name]: link}); // on the page even when the browser refused to keep it
        setVisits((known) => ({...known, [name]: 0}));
        setMade(name);
        if (asked) navigate(page.path, {replace: true});
    };

    const onDeleted = (name: string) => {
        forgetLink(name);
        setLinks((all) => Object.fromEntries(Object.entries(all).filter(([kept]) => kept !== name)));
        if (made === name) setMade(null);
    };

    const label = made ? links[made] : undefined;

    return (
        <div className="sc">
            <Navbar isShrunk={true} />
            <div className="nav-spacer" />

            <div className="sc_container">
                <header className="sc_header">
                    <p className="sc_tag">Shortcut ✉️</p>
                    <h1>Long link in.<br />Short link out.</h1>
                </header>

                <MakeForm key={asked} asked={asked} onMade={onMade} />

                {made && label && <Label name={made} link={label} />}

                {Object.keys(links).length > 0 && <MyLinks links={links} visits={visits} onDeleted={onDeleted} />}

                <p className="sc_report">
                    A link lasts up to 30 days, and where it goes never changes. Something wrong with one? <a href={`mailto:${REPORT_TO}`}>{REPORT_TO}</a>
                </p>
            </div>

            <div className="sc_spacer" />
            {stats && (
                <div className="sc_stats">
                    <span>{stats.activeLinks} link{stats.activeLinks !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{stats.visits} visit{stats.visits !== 1 ? "s" : ""}</span>
                </div>
            )}
            <footer className="sc_footer">
                <p>
                    <a href="/shortcut">✉️ Shortcut</a>, made with ❤️ by Jerry
                </p>
            </footer>
        </div>
    );
}
