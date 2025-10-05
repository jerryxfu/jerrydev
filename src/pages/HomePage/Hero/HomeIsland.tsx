import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./HomeIsland.scss";
import placeholderIcon from "../../../assets/favicon.png";

interface ShortcutItem {
    id: string;
    label: string;
    href: string;
    iconSrc?: string;
}

interface ShortcutWidget {
    id: string;
    title: string;
    items: ShortcutItem[];
}

const OLD_LS_KEY = "homeIsland.shortcuts.v1"; // legacy single-list storage
const WIDGETS_KEY = "homeIsland.widgets.v1";

const seedItems: readonly ShortcutItem[] = [
    { id: "word", label: "Word", href: "https://www.office.com/launch/word", iconSrc: placeholderIcon },
    { id: "excel", label: "Excel", href: "https://www.office.com/launch/excel", iconSrc: placeholderIcon },
    { id: "onedrive", label: "OneDrive", href: "https://onedrive.live.com/", iconSrc: placeholderIcon },
    { id: "moodle", label: "Moodle", href: "https://moodle.com/", iconSrc: placeholderIcon },
] as const;

const seedWidgets: readonly ShortcutWidget[] = [
    { id: "default", title: "Shortcuts", items: seedItems.slice() as ShortcutItem[] },
];

const HomeIsland: React.FC = () => {
    const [widgets, setWidgets] = useState<ShortcutWidget[]>([]);

    const [showAddWidget, setShowAddWidget] = useState(false);
    const [newWidgetTitle, setNewWidgetTitle] = useState("");

    // item adding state (one widget at a time)
    const [addingWidgetId, setAddingWidgetId] = useState<string | null>(null);
    const [itemLabel, setItemLabel] = useState("");
    const [itemHref, setItemHref] = useState("");

    // Load/migrate from localStorage
    useEffect(() => {
        try {
            const rawWidgets = localStorage.getItem(WIDGETS_KEY);
            if (rawWidgets) {
                const parsed = JSON.parse(rawWidgets) as ShortcutWidget[];
                if (Array.isArray(parsed)) {
                    setWidgets(parsed);
                    return;
                }
            }
            // migrate from old single-list storage
            const rawOld = localStorage.getItem(OLD_LS_KEY);
            if (rawOld) {
                const oldItems = JSON.parse(rawOld) as ShortcutItem[];
                if (Array.isArray(oldItems)) {
                    const migrated: ShortcutWidget[] = [{ id: "migrated", title: "Shortcuts", items: oldItems }];
                    setWidgets(migrated);
                    try { localStorage.setItem(WIDGETS_KEY, JSON.stringify(migrated)); } catch {}
                    return;
                }
            }
        } catch {}
        setWidgets(seedWidgets.slice() as ShortcutWidget[]);
        try { localStorage.setItem(WIDGETS_KEY, JSON.stringify(seedWidgets)); } catch {}
    }, []);

    const persist = useCallback((next: ShortcutWidget[]) => {
        setWidgets(next);
        try { localStorage.setItem(WIDGETS_KEY, JSON.stringify(next)); } catch {}
    }, []);

    const canAddWidget = useMemo(() => newWidgetTitle.trim().length > 0, [newWidgetTitle]);
    const canAddItem = useMemo(() => itemLabel.trim().length > 0 && /^https?:\/\//i.test(itemHref.trim()) && !!addingWidgetId, [itemHref, itemLabel, addingWidgetId]);

    const addWidget = useCallback(() => {
        if (!canAddWidget) return;
        const w: ShortcutWidget = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            title: newWidgetTitle.trim(),
            items: [],
        };
        const next = [w, ...widgets];
        persist(next);
        setNewWidgetTitle("");
        setShowAddWidget(false);
    }, [canAddWidget, newWidgetTitle, persist, widgets]);

    const openAddItem = useCallback((wid: string) => {
        setAddingWidgetId(wid === addingWidgetId ? null : wid);
        setItemLabel("");
        setItemHref("");
    }, [addingWidgetId]);

    const addItem = useCallback(() => {
        if (!canAddItem || !addingWidgetId) return;
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const next = widgets.map(w => w.id === addingWidgetId
            ? { ...w, items: [{ id, label: itemLabel.trim(), href: itemHref.trim(), iconSrc: placeholderIcon }, ...w.items] }
            : w
        );
        persist(next);
        setItemLabel("");
        setItemHref("");
        setAddingWidgetId(null);
    }, [addingWidgetId, canAddItem, itemHref, itemLabel, persist, widgets]);

    return (
        <aside className="home-island" aria-label="Home shortcuts">
            <div className="island-header-row">
                <div className="island-title">Home</div>
                <button className="island-add-btn" onClick={() => setShowAddWidget(s => !s)} aria-expanded={showAddWidget} aria-label="Add widget">＋</button>
            </div>

            {showAddWidget && (
                <div className="island-add">
                    <input
                        className="island-input"
                        placeholder="Widget title"
                        value={newWidgetTitle}
                        onChange={(e) => setNewWidgetTitle(e.target.value)}
                    />
                    <button className="island-save" onClick={addWidget} disabled={!canAddWidget}>Add</button>
                </div>
            )}

            <div className="widget-list">
                {widgets.map((w) => (
                    <section key={w.id} className="island-widget" aria-label={w.title}>
                        <div className="widget-header">
                            <div className="widget-title">{w.title}</div>
                            <button className="widget-add-btn" onClick={() => openAddItem(w.id)} aria-expanded={addingWidgetId === w.id} aria-label={`Add to ${w.title}`}>＋</button>
                        </div>

                        {addingWidgetId === w.id && (
                            <div className="widget-add">
                                <input className="island-input" placeholder="Label" value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} />
                                <input className="island-input" placeholder="https://example.com" value={itemHref} onChange={(e) => setItemHref(e.target.value)} />
                                <button className="island-save" onClick={addItem} disabled={!canAddItem}>Add</button>
                            </div>
                        )}

                        <div className="shortcut-list">
                            {w.items.map((it) => (
                                <a key={it.id} className="shortcut-row" href={it.href} target="_blank" rel="noreferrer noopener">
                                    <img className="icon-img" src={it.iconSrc || placeholderIcon} alt="" aria-hidden />
                                    <span className="label">{it.label}</span>
                                </a>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </aside>
    );
};

export default HomeIsland;
