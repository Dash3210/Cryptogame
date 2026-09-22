/**
 * Game-day helpers.
 *
 * The daily cipher, streak tracking, calendar and share cards must all agree on
 * what "today" means. Using `new Date().toISOString()` made every one of them
 * roll over at UTC midnight, which is the wrong moment for most players. These
 * helpers use the device's local calendar day.
 */

export function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
    return toDateKey(now);
}

export function keyToDate(key: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Whole local days between two YYYY-MM-DD keys. Local midnights keep this stable
 * across daylight-saving transitions.
 */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
    const from = keyToDate(fromKey);
    const to = keyToDate(toKey);
    if (!from || !to) return 0;
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
