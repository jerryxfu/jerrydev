import {type MouseEvent, type ReactNode, useState} from "react";
import {CircleQuestionMark, File, FileText, MonitorSmartphone, Radio, Terminal, Users} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type DropType, type P2PReceiveMode} from "../types.ts";
import {type PickedFile} from "../files.ts";
import {useFileDrag} from "../useFileDrag.ts";
import {getCurlCommand, SEND_FILE_COMMAND, SEND_PIPE_COMMAND, SEND_PIPE_WINDOWS_COMMAND, SEND_POWERSHELL_COMMAND} from "../utils.ts";
import CopyField from "./CopyField.tsx";
import "./LandingView.scss";

interface LandingViewProps {
    onSelect: (type: DropType) => void;
    // Files dropped on the File or Direct P2P tile.
    onDropFile: (type: "file" | "p2p", files: PickedFile[]) => void;
    // A file is being dragged over the page: the tiles that take it show it.
    dragging: boolean;
    code: string;
    setCode: (code: string) => void;
    error: string | null;
    loading: boolean;
    onRetrieve: () => void;
    // How this browser receives Direct P2P drops: the notice below says so when it's limited (memory) or can't (none).
    p2pMode: P2PReceiveMode;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: MouseEvent) => void;
}

type TileInfo = {
    type: DropType; label: string; note: string; icon: typeof File;
};

const TILES: TileInfo[] = [
    {type: "text", label: "Text", note: "text or code", icon: FileText},
    {type: "file", label: "File", note: "up to 16 GB", icon: File},
    {type: "p2p", label: "Direct P2P", note: "peer-to-peer", icon: Radio},
    {type: "live", label: "Live", note: "up to 5 people", icon: Users},
];

// The tiles' ways to send, as the list under them describes them: Text and File together, then Direct P2P, then Live.
// `help` is the long-form answer behind the question mark. Optional because only the mode people actually have to
// choose between needs one.
type ModeInfo = {
    id: string; label: string; desc: string; help?: ReactNode;
};

const MODES: ModeInfo[] = [
    {
        id: "cloud", label: "Text & File",
        desc: "Stored in the cloud, up to 500 KB and 16 GB respectively. Expires between 5 minutes and 24 hours. You can send multiple files at once.",
    },
    {
        id: "p2p", label: "Direct P2P",
        desc: "Sent directly from one device to the other. Nothing stored online, no size limit. Faster.",
        help: (
            <>
                <p>
                    <strong>File</strong> is the "Google Drive" approach: the file is uploaded first, then you send a link, and the other person
                    downloads it whenever they get around to it. Use this when you're sending it off and getting on with your day.
                </p>
                <p>
                    <strong>Direct P2P</strong> is the "AirDrop" approach: there's no upload step; the transfer happens live while both tabs are open.
                    Use this when you're both at your devices right now, or when you're moving something between your own.
                </p>
            </>
        ),
    },
    {
        id: "live", label: "Live",
        desc: "A room for up to 5 people, for an hour. Anything someone pastes or drops shows up for everyone, as it happens.",
    },
];

// Sending from a terminal, a tab per system and way: a file through the script, or a command's output piped. Each copy
// stops at its placeholder: the file's path goes after it (typed, or a file dragged in), or it goes after the command.
// The Windows pipe is curl.exe: in Windows PowerShell 5.1, `curl` is Invoke-WebRequest (cmd and PowerShell 7 take either).
const SEND_TABS = [
    {
        id: "sh", label: "macOS, Linux",
        value: `${SEND_FILE_COMMAND} <file>`, copy: `${SEND_FILE_COMMAND} `,
        note: "Send any file, UP TO 16 GB. Add its path after the command. Expires after 12 hours, no view limit.",
    },
    {
        id: "windows", label: "Windows",
        value: `${SEND_POWERSHELL_COMMAND} <file>`, copy: `${SEND_POWERSHELL_COMMAND} `,
        note: "Send any file from PowerShell, UP TO 16 GB. Add its path after the command. Expires after 12 hours, no view limit.",
    },
    {
        id: "pipe", label: "Pipe",
        value: `<command> | ${SEND_PIPE_COMMAND}`, copy: `| ${SEND_PIPE_COMMAND}`,
        note: "Pipe the output of a command to Expedite, UP TO 32 MB. If it's bigger, save it to a file first. Expires after 12 hours, no view limit.",
    },
    {
        id: "pipe-windows", label: "Pipe, Windows",
        value: `<command> | ${SEND_PIPE_WINDOWS_COMMAND}`, copy: `| ${SEND_PIPE_WINDOWS_COMMAND}`,
        note: "Pipe the output of a command to Expedite, UP TO 32 MB. If it's bigger, save it to a file first. Expires after 12 hours, no view limit.",
    },
] as const;

// Under the tiles' modes: the tabs (the composer's setting pills, UploadView.scss), the command, and when to use it.
// Windows' tab first on Windows.
function SendCommands({copiedField, onCopy}: Pick<LandingViewProps, "copiedField" | "onCopy">) {
    const [tabId, setTabId] = useState(() => (/Windows/.test(navigator.userAgent) ? "windows" : "sh"));
    const tab = SEND_TABS.find((t) => t.id === tabId) ?? SEND_TABS[0];
    return (
        <div className="expedite_landing-terminal expedite_terminal-divided">
            <div className="expedite_terminal-head">
                <span className="expedite_terminal-title" id="expedite-terminal-label">
                    <Terminal size={18} strokeWidth={1.5} aria-hidden />
                    Terminal
                </span>
                <div className="expedite_terminal-tabs" role="group" aria-labelledby="expedite-terminal-label">
                    {SEND_TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={`expedite_setting-pill${t.id === tab.id ? " active" : ""}`}
                            aria-pressed={t.id === tab.id}
                            onClick={() => setTabId(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
            <CopyField
                value={tab.value}
                copy={tab.copy}
                label={`A command to send from a terminal (${tab.label})`}
                copyLabel="Copy the command"
                icon={Terminal}
                field={`curl-${tab.id}`}
                copiedField={copiedField}
                onCopy={onCopy}
                small
            />
            <p className="expedite_terminal-note">{tab.note}</p>
        </div>
    );
}

// What's typed or pasted in the code field, as a code: from a pasted link its ?code=, otherwise its letters and digits
// (spaces and dashes dropped), five at most. A pasted link used to be cut to "HTTPS" by the field's length limit.
function toCode(input: string): string {
    const fromLink = input.match(/[?&]code=([A-Za-z0-9]{5})/);
    return (fromLink?.[1] ?? input.replace(/[^A-Za-z0-9]/g, "").slice(0, 5)).toUpperCase();
}

// A tile: a click opens its screen (Live's makes a room first). File and Direct P2P also take a dropped file, and open
// their screen with it.
function Tile({
                  type,
                  label,
                  note,
                  icon: Icon,
                  onSelect,
                  onDropFile,
                  dragging
              }: TileInfo & Pick<LandingViewProps, "onSelect" | "onDropFile" | "dragging">) {
    const takesFiles = type === "file" || type === "p2p";
    const drag = useFileDrag((files) => {
        if (type === "file" || type === "p2p") onDropFile(type, files);
    });
    return (
        <button
            className={`expedite_tile${takesFiles && dragging ? " is-target" : ""}${takesFiles && drag.over ? " is-over" : ""}`}
            data-kind={type}
            onClick={() => onSelect(type)}
            {...(takesFiles ? drag.handlers : {})}
        >
            <Icon size={26} strokeWidth={1.5} />
            <span className="expedite_tile-label">{label}</span>
            <span className="expedite_tile-note">{note}</span>
        </button>
    );
}

export default function LandingView(
    {onSelect, onDropFile, dragging, code, setCode, error, loading, onRetrieve, p2pMode, copiedField, onCopy}: LandingViewProps
) {
    // Which mode's help panel is expanded, if any. A plain disclosure rather
    // than a hover tooltip: hover has no touch equivalent, and this much text
    // in a floating bubble would run off the side of a phone.
    const [openHelp, setOpenHelp] = useState<string | null>(null);

    return (
        <div className="expedite_landing">
            {/* --- Send --- */}
            <section className="expedite_landing-section">
                <p className="expedite_landing-label">Send</p>

                <div className="expedite_tiles">
                    {TILES.map((tile) => (
                        <Tile key={tile.type} {...tile} onSelect={onSelect} onDropFile={onDropFile} dragging={dragging} />
                    ))}
                </div>

                <dl className="expedite_landing-modes">
                    {MODES.map(({id, label, desc, help}) => (
                        <div key={id} className="expedite_mode">
                            <dt className="expedite_mode-term">
                                {label}
                                {help && (
                                    <button
                                        type="button"
                                        className="expedite_help-toggle"
                                        aria-expanded={openHelp === id}
                                        aria-controls={`expedite-help-${id}`}
                                        aria-label={`Which mode should I use? (${label})`}
                                        onClick={() => setOpenHelp(openHelp === id ? null : id)}
                                    >
                                        <CircleQuestionMark size={14} strokeWidth={2} />
                                    </button>
                                )}
                            </dt>
                            {/* The panel lives inside the <dd>: a <div> in a <dl>
                                may only group a <dt> with its <dd>. */}
                            <dd className="expedite_mode-desc">
                                {desc}
                                {help && openHelp === id && (
                                    <div className="expedite_help-panel" id={`expedite-help-${id}`}>
                                        {help}
                                    </div>
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>

                <SendCommands copiedField={copiedField} onCopy={onCopy} />
            </section>

            <div className="expedite_landing-divider" role="separator" />

            {/* --- Receive --- */}
            <section className="expedite_landing-section">
                <p className="expedite_landing-label">Receive</p>

                <input
                    className="expedite_code-input"
                    type="text"
                    placeholder="Enter drop code"
                    value={code}
                    onChange={(e) => setCode(toCode(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && onRetrieve()}
                />

                {error && <p className="expedite_error">{error}</p>}

                <Button
                    variant="main"
                    className="expedite_btn-full"
                    onClick={onRetrieve}
                    disabled={loading || code.trim().length < 5}
                >
                    {loading ? "Resolving..." : "Retrieve"}
                </Button>

                <p className="expedite_landing-hint">
                    Enter the code, or paste the link here or in your browser's address bar.
                </p>

                {p2pMode !== "disk" && (
                    <div className={`expedite_landing-notice${p2pMode === "none" ? " is-blocked" : ""}`}>
                        <MonitorSmartphone size={22} strokeWidth={1.4} />
                        <p className="expedite_landing-notice-text">
                            {p2pMode === "none" ? (
                                <><strong>Direct P2P drops can't be received on a phone or tablet.</strong> Sending works anywhere.</>
                            ) : (
                                <>
                                    <strong>Direct P2P drops are limited to 1 GB on this browser.</strong> Bigger ones need a Chromium-based browser
                                    (e.g. Google Chrome, Edge, Opera, Brave, etc.) on a computer. Sending works anywhere.
                                </>
                            )}
                        </p>
                    </div>
                )}

                {/* The command with <code> for the code: the copy stops before it, for the code to be typed after. */}
                <div className="expedite_landing-terminal expedite_terminal-divided">
                    <p className="expedite_landing-hint">
                        In a terminal (add <code className="expedite_landing-code">-LOJ</code> to download a file, or{" "}
                        <code className="expedite_landing-code">-L</code> to stream it):
                    </p>
                    <CopyField
                        value={getCurlCommand("<code>", "text")}
                        copy={getCurlCommand("", "text")}
                        label="A command to get a drop from a terminal"
                        copyLabel="Copy the command"
                        icon={Terminal}
                        field="curl"
                        copiedField={copiedField}
                        onCopy={onCopy}
                        small
                    />
                </div>
            </section>
        </div>
    );
}
