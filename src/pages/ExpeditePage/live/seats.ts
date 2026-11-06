// Apart from the room's calls (room.ts), so the page's page.ts can list your seats for the palette without loading the
// room's code.

// Your seat in each room you're in, by code: the token the API gave, kept until the room ends. A reload, or the room's
// link opened again in this browser, puts you back in your seat rather than in a new one. With it, the files downloaded
// from the room in this browser, by item id: a reload (a phone's browser reloads a tab it had put away) still knows them.
export const SEATS_KEY = "expedite:live";

export type Seats = Record<string, { token: string; expiresAt: string; downloaded?: string[] }>;

export function readSeats(): Seats {
    try {
        const seats = JSON.parse(localStorage.getItem(SEATS_KEY) ?? "{}") as Seats;
        // Rooms that have ended are forgotten.
        return Object.fromEntries(Object.entries(seats).filter(([, seat]) => Temporal.Instant.compare(seat.expiresAt, Temporal.Now.instant()) > 0));
    } catch {
        return {};
    }
}

function writeSeats(seats: Seats): void {
    try {
        localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
    } catch { /* storage refused (a private window): the seat lasts as long as the page */
    }
}

export function seatToken(code: string): string | null {
    return readSeats()[code]?.token ?? null;
}

export function keepSeat(code: string, token: string, expiresAt: string): void {
    const seats = readSeats();
    writeSeats({...seats, [code]: {...seats[code], token, expiresAt}});
}

export function downloadedIn(code: string): string[] {
    return readSeats()[code]?.downloaded ?? [];
}

export function keepDownloaded(code: string, ids: Iterable<string>): void {
    const seats = readSeats();
    const seat = seats[code];
    if (!seat) return; // no seat kept (storage refused): they last as long as the page
    writeSeats({...seats, [code]: {...seat, downloaded: [...ids]}});
}

export function forgetSeat(code: string): void {
    const seats = readSeats();
    delete seats[code];
    writeSeats(seats);
}
