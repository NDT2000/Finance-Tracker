// Shared formatting for money, months and amount inputs.
// Amounts from the API are exact decimal strings; Intl formats strings without first
// converting them to floating-point numbers, so they are passed through unchanged.

// "1234.5" + "USD" -> "$1,234.50". signed adds an explicit + for positive values ("+$40.00").
export function formatMoney(value, currency, { signed = false, locale } = {}) {
    if (value === null || value === undefined || value === '') return '—';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(value);
}

// The smallest amount a currency allows, for <input type="number" step>: 2 digits -> "0.01", 0 -> "1".
export function amountStep(digits = 2) {
    return digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`;
}

// Today's month as "YYYY-MM", the format of <input type="month">, in the browser's own time zone.
export function currentMonth(today = new Date()) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

// "2026-11" -> "November 2026"
export function formatMonth(month, locale) {
    const [year, number] = month.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(Date.UTC(year, number - 1, 1));
}

// Move a "YYYY-MM" month forwards or backwards: shiftMonth("2026-01", -1) -> "2025-12"
export function shiftMonth(month, by) {
    const [year, number] = month.split('-').map(Number);
    const index = year * 12 + (number - 1) + by;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

// Short money for chart axes: 1600 -> "$1.6K", 250 -> "$250". Exact values belong in tooltips and tables.
export function formatAxisMoney(value, currency, { locale } = {}) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

// "Nov 24, 2026, 7:41 PM" for an ISO timestamp, or a dash when there is none.
// locale and timeZone default to the viewer's; tests pass fixed values.
export function formatDateTime(iso, locale, timeZone) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone });
}
