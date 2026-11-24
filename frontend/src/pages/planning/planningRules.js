// Plain rules behind the planning workspace, kept free of React so they can be unit-tested.
// Every projected figure comes from the backend engine (GET /api/plans/{id}/projection); nothing here
// recalculates money. These functions only describe, label and package what the user enters.

// The five event types and what each does to the modelled balances (docs/financial-planning.md)
export const EVENT_KINDS = {
    INCOME: { label: 'Salary / other income', effect: 'Adds to cash', direction: 'in' },
    EXPENSE: { label: 'Spending', effect: 'Reduces cash', direction: 'out' },
    INVESTMENT: { label: 'Investment contribution', effect: 'Moves money from cash into investments (a transfer, not spending)', direction: 'transfer' },
    LOAN_REPAYMENT: { label: 'Loan repayment', effect: 'Reduces cash (the remaining loan balance is not modelled)', direction: 'out' },
    WITHDRAWAL: { label: 'Investment withdrawal', effect: 'Moves available investments into cash; any shortfall is reported as unfunded', direction: 'transfer' },
};

// The month a 1-based plan month falls in: monthAt("2026-11", 3) -> "2027-01"
export function monthAt(startMonth, planMonth) {
    const [year, month] = startMonth.split('-').map(Number);
    const index = year * 12 + (month - 1) + (planMonth - 1);
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

// "2027-01" -> "Jan 2027"
export function shortMonth(month, locale) {
    const [year, number] = month.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(year, number - 1, 1));
}

// One option per plan month, for picking event months by name: [{ value: 1, label: "Nov 2026" }, ...]
export function monthOptions(plan, locale) {
    return Array.from({ length: plan.months }, (_, i) => ({ value: i + 1, label: shortMonth(monthAt(plan.startMonth, i + 1), locale) }));
}

// "Nov 2026" for a one-time event, "Nov 2026 – Oct 2027 (12 months)" for a monthly one
export function scheduleLabel(event, plan, locale) {
    const first = shortMonth(monthAt(plan.startMonth, event.firstMonth), locale);
    if (event.recurrence === 'ONCE') return first;
    const count = event.lastMonth - event.firstMonth + 1;
    return `${first} – ${shortMonth(monthAt(plan.startMonth, event.lastMonth), locale)} (${count} ${count === 1 ? 'month' : 'months'})`;
}

// Body for POST/PUT /api/plans. months becomes a number; amounts stay exact strings.
export function planPayload(form) {
    return {
        name: form.name.trim(),
        currency: form.currency,
        startMonth: form.startMonth,
        months: Number(form.months),
        openingCash: form.openingCash,
        openingInvestments: form.openingInvestments,
        cashReserve: form.cashReserve,
        annualReturnPercent: form.annualReturnPercent,
    };
}

// Body for POST/PUT /api/plans/{id}/events. A one-time event ends in the month it starts.
export function eventPayload(form) {
    const firstMonth = Number(form.firstMonth);
    return {
        name: form.name.trim(),
        kind: form.kind,
        recurrence: form.recurrence,
        amount: form.amount,
        firstMonth,
        lastMonth: form.recurrence === 'ONCE' ? firstMonth : Number(form.lastMonth),
    };
}

// The plan's value at the end of the horizon, as the backend calculated it (last month's cashAndInvestments)
export function finalCombinedValue(projection) {
    return projection.months.at(-1)?.cashAndInvestments ?? null;
}

// Funding checks to show, most serious first. tone follows the spec: danger for negative cash and
// unfunded withdrawals, warning for dipping below the reserve, success when nothing needs attention.
export function fundingChecks(projection, locale) {
    const checks = [];
    if (projection.firstCashShortfall) {
        checks.push({ tone: 'danger', title: `Cash runs out in ${shortMonth(projection.firstCashShortfall, locale)}` });
    }
    if (Number(projection.totalUnfundedWithdrawals) > 0) {
        checks.push({ tone: 'danger', title: 'Some withdrawals cannot be funded', amount: projection.totalUnfundedWithdrawals });
    }
    if (projection.firstBelowReserve) {
        checks.push({ tone: 'warning', title: `Cash drops below your reserve in ${shortMonth(projection.firstBelowReserve, locale)}` });
    }
    if (!checks.length) {
        checks.push({ tone: 'success', title: 'No funding problems' });
    }
    return checks;
}
