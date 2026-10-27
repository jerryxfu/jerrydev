import React, {type CSSProperties, type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState} from "react";
import {
    Check,
    Clipboard,
    ClipboardPaste,
    Clock3,
    Copy,
    Download,
    File as FileIcon,
    Link,
    LoaderCircle,
    LogOut,
    type LucideIcon,
    Paperclip,
    Pencil,
    Power,
    QrCode,
    SendHorizontal,
    Trash2,
    UserMinus,
    Users
} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import Button from "@/components/Button/Button.tsx";
import useMediaQuery from "../../../hooks/useMediaQuery.ts";
import type {LiveItem, LiveMember, PartProgress, UploadSnapshot} from "../types.ts";
import type {LiveRoomState} from "../live/useLiveRoom.ts";
import {formatBytes, getDropUrl} from "../utils.ts";
import FilePreview, {CodeView, kindOf, MINI_LINES} from "./FilePreview.tsx";
import {STATE_LETTER} from "./UploadProgress.tsx";
import "./LiveView.scss";

interface LiveViewProps {
    live: LiveRoomState;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    /** Back to Expedite's landing: after leaving, or once the room has ended. */
    onExit: () => void;
}

const IMAGE = /^image\/(png|jpe?g|gif|webp|avif|svg\+xml|bmp)$/;
const URL_ONLY = /^https?:\/\/\S+$/;

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});

// "42:18 left", a second at a time. The last five minutes in the danger colour.
function TimeLeft({until}: { until: string }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const left = Math.max(0, new Date(until).getTime() - now);
    const minutes = Math.floor(left / 60_000);
    const seconds = Math.floor(left / 1000) % 60;
    return (
        <span className={`live_meta${left < 5 * 60_000 ? " is-ending" : ""}`}>
            <Clock3 size={15} aria-hidden />
            {minutes}:{String(seconds).padStart(2, "0")} left
        </span>
    );
}

// A button that asks first, in place: the question, then the action and Cancel.
function Confirm({label, icon, question, action, onConfirm, iconOnly = false}: {
    label: string; icon: LucideIcon; question: string; action: string; onConfirm: () => void; iconOnly?: boolean;
}) {
    const [asking, setAsking] = useState(false);
    if (!asking) {
        return iconOnly
            ? <Button start={icon} aria-label={label} title={label} onClick={() => setAsking(true)} />
            : <Button start={icon} onClick={() => setAsking(true)}>{label}</Button>;
    }
    return (
        <span className="live_confirm" role="group" aria-label={question}>
            <span>{question}</span>
            <Button variant="danger" onClick={() => {
                setAsking(false);
                onConfirm();
            }}>{action}</Button>
            <Button onClick={() => setAsking(false)}>Cancel</Button>
        </span>
    );
}

// Your name, a click away from changing it.
function NameEditor({name, onRename}: { name: string; onRename: (name: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(name);

    if (!editing) {
        return (
            <button
                type="button" className="live_name live_name--edit" title="Rename yourself"
                onClick={() => {
                    setValue(name);
                    setEditing(true);
                }}
            >
                {name}
                <Pencil size={12} aria-hidden />
            </button>
        );
    }

    const save = () => {
        const tidy = value.trim();
        if (tidy && tidy !== name) onRename(tidy);
        setEditing(false);
    };
    return (
        <input
            className="live_name-input" aria-label="Your name" autoFocus maxLength={32}
            // Selected, so typing replaces it.
            onFocus={(e) => e.target.select()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
            }}
        />
    );
}

// What you type or pick goes into your box. Pasting anywhere on the page sends at once (LiveView); here, a text can be
// written first. Enter is a new line, as in any text: a room isn't a chat. On a laptop Shift+Enter sends; on a phone,
// the Send button.
function Composer({onText, onFiles}: { onText: (text: string) => Promise<boolean>; onFiles: (files: File[]) => void }) {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const picker = useRef<HTMLInputElement>(null);
    const laptop = useMediaQuery("(hover: hover) and (pointer: fine)");
    // Reading the clipboard from a button: Chromium and Safari, Firefox from 127. A phone's way to paste a picture.
    const canRead = typeof navigator !== "undefined" && typeof navigator.clipboard?.read === "function";

    const send = async (e?: FormEvent) => {
        e?.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true);
        if (await onText(text)) setText("");
        setBusy(false);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (laptop && e.key === "Enter" && e.shiftKey && !e.nativeEvent.isComposing) void send(e);
    };

    const pasteClipboard = async () => {
        setNote(null);
        try {
            const files: File[] = [];
            let pasted = "";
            for (const item of await navigator.clipboard.read()) {
                const image = item.types.find((type) => type.startsWith("image/"));
                if (image) {
                    const blob = await item.getType(image);
                    files.push(new File([blob], `pasted.${image.split("/")[1]?.replace("+xml", "") ?? "png"}`, {type: image}));
                } else if (item.types.includes("text/plain")) {
                    pasted += await (await item.getType("text/plain")).text();
                }
            }
            if (files.length) onFiles(files);
            else if (pasted.trim()) await onText(pasted);
            else setNote("Nothing to paste.");
        } catch {
            setNote("This browser didn't let the page read the clipboard. Paste in the box instead.");
        }
    };

    return (
        <form className="live_composer" onSubmit={send}>
            <textarea
                className="live_input" rows={2} placeholder="Type or paste here..." aria-label="Something to send"
                value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
            />
            {/* The buttons, a laptop's hint under each side: how else to send, and the keys. A phone has neither. */}
            <div className="live_composer-row">
                <div className="live_composer-side">
                    <div className="live_composer-buttons">
                        {/* Their icons in the landing tiles' colours (Expedite.scss): File's, and Text's for pasting. */}
                        <Button start={Paperclip} data-kind="file" onClick={() => picker.current?.click()}>File</Button>
                        {canRead && <Button start={ClipboardPaste} data-kind="text" onClick={() => void pasteClipboard()}>Paste</Button>}
                    </div>
                    {laptop && <p className="live_hint">Paste or drop anywhere</p>}
                </div>
                <div className="live_composer-side is-end">
                    <Button variant="main" type="submit" start={SendHorizontal} disabled={!text.trim() || busy}>Send</Button>
                    {laptop && <p className="live_hint">Shift+Enter to send</p>}
                </div>
            </div>
            <input
                ref={picker} type="file" multiple hidden
                onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    if (files.length) onFiles(files);
                }}
            />
            {note && <p className="expedite_error">{note}</p>}
        </form>
    );
}

// A file's parts as it goes up, as in File mode's grid (UploadProgress), in a row. Keyed by state too: a part that
// changes state is drawn anew, and flashes as it appears (LiveView.scss).
function PartSquares({parts}: { parts: PartProgress[] }) {
    return (
        <span className="live_parts" aria-hidden>
            {parts.map((p) => (
                <span key={`${p.partNumber}-${p.state}`} className={`live_part state-${p.state}`}>{STATE_LETTER[p.state]}</span>
            ))}
        </span>
    );
}

function ItemCard({item, mine, fresh, progress, copiedField, onCopy, onDelete}: {
    item: LiveItem; mine: boolean; fresh: boolean; progress: UploadSnapshot | undefined;
    copiedField: string | null; onCopy: LiveViewProps["onCopy"]; onDelete: () => void;
}) {
    const field = `live-${item.id}`;
    const text = item.text?.trim() ?? "";
    const image = item.kind === "file" && item.fileUrl && IMAGE.test(item.mimeType ?? "");
    // Any other finished file: a video's or a sound's player (only its start loads, until it plays), a text file's first
    // lines. A PDF opens from its name instead: a viewer per card would be heavy, and too narrow to read.
    const kind = item.kind === "file" && item.fileUrl && !image ? kindOf(item.fileName ?? "", item.mimeType) : null;
    // Your file going up: how far it's got. The others' show "Sending..." (their progress stays on their device).
    const sending = item.status === "pending" ? progress : undefined;
    const percent = sending ? Math.floor((sending.uploadedBytes / Math.max(1, sending.totalBytes)) * 100) : null;

    return (
        <article className={`live_item${fresh && !mine ? " is-fresh" : ""}`}>
            {item.kind === "text" && item.text != null && (
                item.language
                    ? <CodeView text={item.text} language={item.language} collapseTo={MINI_LINES} />
                    : URL_ONLY.test(text)
                        ? <a className="live_link" href={text} target="_blank" rel="noreferrer noopener">{text}</a>
                        : <p className="live_text">{item.text}</p>
            )}

            {image && (
                <a href={item.fileUrl} target="_blank" rel="noreferrer noopener" className="live_img-link">
                    <img className="live_img" src={item.fileUrl} alt={item.fileName ?? ""} loading="lazy" />
                </a>
            )}
            {item.fileUrl && (kind === "video" || kind === "audio" || kind === "text") && (
                <FilePreview src={item.fileUrl} name={item.fileName ?? ""} mimeType={item.mimeType} size={item.size} mini />
            )}
            {item.kind === "file" && (
                <div className="live_file">
                    {item.status === "pending" ? <LoaderCircle size={16} className="live_spin" aria-hidden /> : <FileIcon size={16} aria-hidden />}
                    {percent != null && <span className="live_file-pct">{percent}%</span>}
                    {kind === "pdf"
                        ? <a className="live_file-name" href={item.fileUrl} target="_blank" rel="noreferrer noopener">{item.fileName}</a>
                        : <span className="live_file-name">{item.fileName}</span>}
                    <span className="live_file-size">
                        {sending ? `${formatBytes(sending.uploadedBytes)} / ${formatBytes(item.size)}` : formatBytes(item.size)}
                    </span>
                </div>
            )}
            {item.status === "pending" && (
                sending && percent != null
                    ? <div className="live_progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                        <div style={{width: `${percent}%`}} />
                    </div>
                    : <p className="live_hint">Sending...</p>
            )}

            <footer className="live_item-foot">
                <time dateTime={item.createdAt}>{clock(item.createdAt)}</time>
                {sending && sending.parts.length > 0 && <PartSquares parts={sending.parts} />}
                {item.kind === "text" && item.text != null && (
                    <button type="button" className="live_action" onClick={(e) => onCopy(item.text ?? "", field, e)}>
                        {copiedField === field ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                        {copiedField === field ? "Copied" : "Copy"}
                    </button>
                )}
                {item.kind === "file" && item.downloadUrl && (
                    <a className="live_action" href={item.downloadUrl}>
                        <Download size={14} aria-hidden />
                        Download
                    </a>
                )}
                {mine && (
                    <button type="button" className="live_action live_action--delete" onClick={onDelete}
                            aria-label={item.status === "pending" ? "Stop sending" : "Delete"}>
                        <Trash2 size={14} aria-hidden />
                    </button>
                )}
            </footer>
        </article>
    );
}

// Someone's box: their name (and, on a laptop, how many items they have: a phone's tabs say it), then what they sent,
// the newest first. Yours has the composer, and takes what's dropped. It glows in their colour, and pulses while they're
// sending a file.
function Box({member, mine, canRemove, items, live, viewed, counted, hidden, target, copiedField, onCopy}: {
    member: LiveMember; mine: boolean; canRemove: boolean; items: LiveItem[]; live: LiveRoomState;
    viewed: ReadonlySet<string>; counted: boolean; hidden: boolean; target: boolean; copiedField: string | null;
    onCopy: LiveViewProps["onCopy"];
}) {
    const busy = items.some((i) => i.status === "pending");
    return (
        <section
            hidden={hidden}
            className={`live_box${mine ? " is-mine" : ""}${!mine && !member.online ? " is-away" : ""}${busy ? " is-busy" : ""}${target ? " is-target" : ""}`}
            style={{"--member": `var(--live-${member.color})`} as CSSProperties}
            aria-label={mine ? "Your box" : `${member.name}'s box`}
        >
            <header className="live_box-head">
                <span className="live_dot" aria-hidden />
                {mine
                    ? <NameEditor name={member.name} onRename={(name) => void live.renameMe(name)} />
                    : <span className="live_name">{member.name}</span>}
                {counted && <span className="live_count">({items.length})</span>}
                {mine
                    ? <span className="live_presence">you</span>
                    : <span className={`live_presence${member.online ? " is-online" : ""}`}>{member.online ? "here" : "away"}</span>}
                {canRemove && (
                    <span className="live_box-tools">
                        <Confirm
                            label={`Remove ${member.name}`} icon={UserMinus} iconOnly
                            question="Remove them?" action="Remove"
                            onConfirm={() => void live.removePerson(member.id)}
                        />
                    </span>
                )}
            </header>

            {mine && <Composer onText={live.postText} onFiles={live.postFiles} />}

            <p className="live_subtitle">Upload history</p>
            {items.length > 0 ? (
                <ol className="live_items">
                    {items.map((item) => (
                        <li key={item.id}>
                            <ItemCard
                                item={item} mine={mine} fresh={live.fresh.has(item.id) && !viewed.has(item.id)}
                                progress={live.uploads[item.id]}
                                copiedField={copiedField} onCopy={onCopy} onDelete={() => void live.removeItem(item.id)}
                            />
                        </li>
                    ))}
                </ol>
            ) : <p className="live_empty">Nothing yet.</p>}
        </section>
    );
}

/**
 * A live room's bar: its code and link (and their QR code, which opens over the page), the time left, who's in it, and
 * leaving or ending it. In Expedite's header, beside the title on a laptop, so the boxes get the room. On a phone,
 * leaving sits at the title's right, as at the bar's end on a laptop, and the rest under it (LiveView.scss). Nothing
 * once the room has closed.
 */
export function LiveBar({live, copiedField, onCopy, onExit}: LiveViewProps) {
    const [showQr, setShowQr] = useState(false);
    const {room, members, ownerId, closed} = live;
    if (!room || closed) return null;

    const link = getDropUrl(room.code);
    const leave = () => void live.leave().then((done) => done && onExit());
    return (
        <div className="live_bar">
            <div className="live_bar-rest">
                <button type="button" className="live_code" onClick={(e) => onCopy(room.code, "live-code", e)} title="Copy the code">
                    {room.code}
                    {copiedField === "live-code" ? <Check size={16} aria-hidden /> : <Clipboard size={16} aria-hidden />}
                </button>
                <Button start={copiedField === "live-link" ? Check : Link} onClick={(e) => onCopy(link, "live-link", e)}>
                    {copiedField === "live-link" ? "Copied" : "Copy link"}
                </Button>
                <Button start={QrCode} aria-label="QR code of the room's link" title="QR code" aria-expanded={showQr}
                        onClick={() => setShowQr(!showQr)} />
                <TimeLeft until={room.expiresAt} />
                <span className="live_meta">
                    <Users size={15} aria-hidden />
                    {members.length} of {room.seats}
                </span>
            </div>
            <span className="live_bar-end">
                {room.me.id === ownerId
                    ? <Confirm label="End room" icon={Power} question="End it for everyone?" action="End room" onConfirm={leave} />
                    : <Confirm label="Leave" icon={LogOut} question="Leave? What you sent goes too." action="Leave" onConfirm={leave} />}
            </span>

            {/* Dark on white in every theme, as the drops' QR code: some scanners can't read a light code on a dark ground. */}
            {showQr && (
                <figure className="expedite_qr live_qr">
                    <QRCodeSVG value={link} size={168} marginSize={3} bgColor="#ffffff" fgColor="#1a1a1a" title="QR code of the room's link" />
                    <figcaption className="text-caption">Scan to join from another device</figcaption>
                </figure>
            )}
        </div>
    );
}

/**
 * A live room: a box per person, yours first (its bar is LiveBar, in Expedite's header). On a laptop the boxes sit side
 * by side, each scrolling on its own; on a phone, one at a time, a tab per name. Files dropped anywhere on the page
 * (Expedite takes them) go into your box, which shows where they land while one is dragged over (`dragging`).
 */
export default function LiveView({live, copiedField, onCopy, onExit, dragging}: LiveViewProps & { dragging: boolean }) {
    const {room, members, ownerId, items, closed} = live;
    const wide = useMediaQuery("(min-width: 900px)");
    // On a phone, whose box is shown (null: yours), and the items already seen in each: for the tabs' dots, and so that a
    // card flashes the first time it's seen only (a hidden box shown again plays its animations again).
    const [tab, setTab] = useState<string | null>(null);
    const [viewed, setViewed] = useState<ReadonlySet<string>>(new Set());

    const meId = room?.me.id ?? "";
    const isOwner = meId !== "" && meId === ownerId;
    const me = members.find((m) => m.id === meId);
    const ordered = useMemo(() => [...(me ? [me] : []), ...members.filter((m) => m.id !== meId)], [me, members, meId]);
    // Each person's items, the newest first.
    const byMember = useMemo(() => {
        const map = new Map<string, LiveItem[]>();
        for (const item of items) map.set(item.memberId, [item, ...(map.get(item.memberId) ?? [])]);
        return map;
    }, [items]);

    // Pasted anywhere but in a field: sent at once, a picture or a file as a file, else as a text. Files pasted in a
    // field go too; text pasted in one stays there (the composer's to send, or the name being edited).
    const {postFiles, postText} = live;
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const files = [...(e.clipboardData?.files ?? [])];
            if (files.length) {
                e.preventDefault();
                postFiles(files);
                return;
            }
            if ((e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) return;
            const text = e.clipboardData?.getData("text/plain") ?? "";
            if (!text.trim()) return;
            e.preventDefault();
            void postText(text);
        };
        document.addEventListener("paste", onPaste);
        return () => document.removeEventListener("paste", onPaste);
    }, [postFiles, postText]);

    if (!room) return null;

    if (closed) {
        return (
            <div className="live_closed">
                <p>{closed === "ended" ? "This room has ended." : "You were removed from this room."}</p>
                <Button variant="main" onClick={onExit}>Back to Expedite</Button>
            </div>
        );
    }

    const shownTab = ordered.some((m) => m.id === tab) ? tab : null;
    const unseen = (m: LiveMember) => m.id !== (shownTab ?? meId) && (byMember.get(m.id) ?? []).some((i) => live.fresh.has(i.id) && !viewed.has(i.id));
    // What was in the box left behind has been seen: no dot for it, and no flash when its box is shown again.
    const pick = (id: string | null) => {
        const ids = (byMember.get(shownTab ?? meId) ?? []).map((i) => i.id);
        setViewed((prev) => new Set([...prev, ...ids]));
        setTab(id);
    };

    return (
        <div className="live">
            {live.error && <p className="expedite_error">{live.error}</p>}
            {live.lost && (
                <p className="live_lost">
                    Lost the connection to the room.
                    <Button onClick={() => void live.reconnect()}>Reconnect</Button>
                </p>
            )}

            {!wide && ordered.length > 1 && (
                <div className="live_tabs" role="tablist" aria-label="Whose box to show">
                    {ordered.map((m) => {
                        const selected = (shownTab ?? meId) === m.id;
                        return (
                            <button
                                key={m.id} type="button" role="tab" aria-selected={selected}
                                className={`live_tab${selected ? " is-selected" : ""}`}
                                style={{"--member": `var(--live-${m.color})`} as CSSProperties}
                                onClick={() => pick(m.id === meId ? null : m.id)}
                            >
                                <span className="live_dot" aria-hidden />
                                <span className="live_tab-name">{m.id === meId ? "You" : m.name}</span>
                                <span className="live_count">({(byMember.get(m.id) ?? []).length})</span>
                                {unseen(m) && <span className="live_unseen" aria-label="new" />}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Every box stays drawn. On a phone all but the picked one are hidden, so switching shows a box as it was,
                rather than drawing it anew: its pictures, players and previews would load again. */}
            <div className="live_boxes" style={{"--count": ordered.length + (wide && ordered.length === 1 ? 1 : 0)} as CSSProperties}>
                {ordered.map((m) => (
                    <Box
                        key={m.id} member={m} mine={m.id === meId} canRemove={isOwner && m.id !== meId}
                        items={byMember.get(m.id) ?? []} live={live} viewed={viewed} counted={wide}
                        hidden={!wide && m.id !== (shownTab ?? meId)} target={m.id === meId && dragging}
                        copiedField={copiedField} onCopy={onCopy}
                    />
                ))}
                {ordered.length === 1 && (
                    <div className="live_waiting">
                        <Users size={28} strokeWidth={1.4} aria-hidden />
                        <p>Share the code or the link to bring people in. Up to {room.seats - 1} more can join.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
