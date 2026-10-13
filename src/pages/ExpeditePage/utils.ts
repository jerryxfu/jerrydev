// Always one decimal place
export function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return "0.0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

export function formatDuration(ms: number): string {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
}

export function timeUntil(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// "at 22:31", "tomorrow at 09:15", "on 10/12/2026 at 09:15": when, in the reader's own clock.
export function when(iso: string): string {
    const at = new Date(iso);
    const time = at.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (at.toDateString() === new Date().toDateString()) return `at ${time}`;
    if (at.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;
    return `on ${at.toLocaleDateString()} at ${time}`;
}

export function getDropUrl(code: string): string {
    return `${window.location.origin}/expedite?code=${code}`;
}

export function formatSpeed(bps: number): string {
    if (!bps || bps <= 0 || !isFinite(bps)) return "—";
    return `${formatBytes(bps)}/s`;
}

export function formatEta(secs: number): string {
    if (!isFinite(secs) || secs <= 0) return "—";
    if (secs < 60) return `${Math.ceil(secs)}s`;
    const m = Math.floor(secs / 60);
    const s = Math.ceil(secs % 60);
    return `${m}m ${s}s`;
}