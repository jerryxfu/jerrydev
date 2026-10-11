import Disclosure from "./Disclosure.tsx";

interface RelaySettingProps {
    useTurn: boolean;
    setUseTurn: (on: boolean) => void;
    // This month's relay quota is used up.
    relayDisabled: boolean;
}

// Direct P2P's relay, on both its screens (send and receive), folded away with the rest of the technical side: it kicks
// in by itself when a direct route fails, so few need it. Said beside the title when it's on.
export default function RelaySetting({useTurn, setUseTurn, relayDisabled}: RelaySettingProps) {
    const on = useTurn && !relayDisabled;
    return (
        <Disclosure id="p2p-transport" title="Advanced" note={on ? "relay forced" : undefined}>
            <div className="expedite_settings">
                <p className="expedite_settings-title">Transport</p>
                <div className="expedite_setting-row">
                    <span className="text-small">
                        Force TURN relay
                        <span className="expedite_setting-sub" id="p2p-relay-about">
                            Expedite tries a direct connection first and switches to the relay by
                            itself if that fails. Turn it on if direct transfers keep failing on your
                            network. The relay (Traversal Using Relays around NAT, through Cloudflare
                            TURN) passes the file through a server instead of straight between the
                            devices.
                        </span>
                    </span>
                    <button
                        className={`expedite_toggle ${on ? "active" : ""}`}
                        role="switch"
                        aria-checked={on}
                        aria-label="Force TURN relay"
                        aria-describedby="p2p-relay-about"
                        onClick={() => setUseTurn(!useTurn)}
                        disabled={relayDisabled}
                    >
                        <span className="expedite_toggle-knob" />
                    </button>
                </div>
                {relayDisabled && (
                    <p className="expedite_p2p-standby">
                        This month's relay quota is used up, so transfers are direct-only until it resets.
                    </p>
                )}
            </div>
        </Disclosure>
    );
}
