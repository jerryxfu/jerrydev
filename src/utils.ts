export function formatDate(date: Date): string { // 0 pad for Safari
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();

    // Rounded, not floored. Two local midnights an exact number of days apart are 23h or 25h short of a
    // multiple of 24h whenever a DST transition sits between them, so Math.floor turned N*24h - 1h into
    // N-1 and every card lost a day. Live for eight months of the year in any DST zone: on 2026-09-06 the
    // Home Island card (2026-02-05) read "212 days ago" when the true count was 213, and Zone01 (2019)
    // read 2804 instead of 2805. Only dates inside the current DST period were ever right.
    //
    // The field constructor rather than setHours, so both endpoints are built from calendar fields and
    // never carry a time-of-day. formatPostAge in BlogPage/posts.tsx has always done it this way, and its
    // comment names this exact bug ("the same rounding issue that bit the project footer") — that fix was
    // written and never backported. This is the backport.
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((midnight(new Date()) - midnight(date)) / 86_400_000);

    return `${day}-${month}-${year} (${diffDays} days ago)`;
}
