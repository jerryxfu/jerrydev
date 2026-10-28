import {apiBaseUrl} from "../../main.tsx";

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

// The drop from a terminal, through the API's raw route: a text drop is printed, a file is saved under its name (-LOJ).
// The flags go last, where they're easy to change (curl takes them anywhere).
export function getCurlCommand(code: string, type: "text" | "file"): string {
    return `curl ${apiBaseUrl}/expedite/raw/${code}${type === "file" ? " -LOJ" : ""}`;
}

// Sending from a terminal: a file of any size through the script (public/expedite.sh, the file after `sh -s`) or its
// PowerShell twin (public/expedite.ps1), and a command's output piped straight to the API (32 MB at most). On Windows,
// curl.exe: Windows PowerShell's `curl` is Invoke-WebRequest.
export const SEND_FILE_COMMAND = "curl -fsSL https://jerryxf.net/expedite.sh | sh -s";
export const SEND_POWERSHELL_COMMAND = "& ([scriptblock]::Create((irm https://jerryxf.net/expedite.ps1)))";
export const SEND_PIPE_COMMAND = `curl -T - ${apiBaseUrl}/expedite/raw/`;
export const SEND_PIPE_WINDOWS_COMMAND = `curl.exe -T - ${apiBaseUrl}/expedite/raw/`;

/** Hands a Blob to the browser's downloads, under this name. */
export function saveBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    // Not revoked at once: a browser may still be starting the download from it (Firefox, Safari).
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function formatSpeed(bps: number): string {
    if (!bps || bps <= 0 || !isFinite(bps)) return "—";
    return `${formatBytes(bps)}/s`;
}

export function formatEta(secs: number): string {
    if (!isFinite(secs) || secs <= 0) return "—";
    // Rounded up whole first, so 119.5 s reads "2m 0s", not "1m 60s".
    const whole = Math.ceil(secs);
    if (whole < 60) return `${whole}s`;
    return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}