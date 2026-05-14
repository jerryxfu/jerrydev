export function formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const today = new Date();
    // Zero out time for both dates
    today.setHours(0, 0, 0, 0);
    const initial_date = new Date(date);
    initial_date.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - initial_date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${day}-${month}-${year} (${diffDays} days ago)`;
}
