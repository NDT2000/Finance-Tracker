// Exact arithmetic on decimal money strings for small display calculations (e.g. budget remaining).
// Values are converted to whole minor units (cents) as BigInt, so 350 - 335.95 is exactly 14.05,
// never 14.050000000000011. The backend stays authoritative for every stored or reported total.

// "335.95" -> 33595n with 2 decimal digits. Extra digits beyond the currency's are rejected.
export function toMinorUnits(value, digits = 2) {
    const text = String(value).trim();
    const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
    if (!match) throw new Error(`Not a decimal amount: ${value}`);
    const [, sign, whole, fraction = ''] = match;
    if (fraction.replace(/0+$/, '').length > digits) throw new Error(`${value} has more than ${digits} decimal places`);
    const units = BigInt(whole + fraction.padEnd(digits, '0').slice(0, digits || 0));
    return sign ? -units : units;
}

// 1405n with 2 digits -> "14.05"; -5n -> "-0.05"; 1234n with 0 digits -> "1234"
export function fromMinorUnits(units, digits = 2) {
    const negative = units < 0n;
    const text = (negative ? -units : units).toString().padStart(digits + 1, '0');
    const whole = digits ? text.slice(0, -digits) : text;
    const fraction = digits ? `.${text.slice(-digits)}` : '';
    return `${negative ? '-' : ''}${whole}${fraction}`;
}

// a - b, exactly, as a decimal string
export function subtractMoney(a, b, digits = 2) {
    return fromMinorUnits(toMinorUnits(a, digits) - toMinorUnits(b, digits), digits);
}

// What share of total is part, as a whole percentage (rounded down): 335.95 of 350 -> 95.
// Returns null when total is zero, so callers can show "no limit" instead of dividing by zero.
export function percentOf(part, total, digits = 2) {
    const whole = toMinorUnits(total, digits);
    if (whole === 0n) return null;
    return Number((toMinorUnits(part, digits) * 100n) / whole);
}
