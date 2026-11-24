// Plain functions behind the Transactions page, kept free of React so they can be unit-tested.
import { fromMinorUnits, toMinorUnits } from '../../money.js';

export const TYPE_LABELS = { INCOME: 'Income', EXPENSE: 'Expense', REFUND: 'Refund' };
export const TYPE_TONES = { INCOME: 'success', EXPENSE: 'pending', REFUND: 'info' };

// Money in (income, refunds) gets "+", money out (expenses) gets "−"; formatted is e.g. "$40.00".
export function signFor(type) {
    return type === 'EXPENSE' ? '−' : '+';
}

// Newest first; entries on the same day keep the order they were added in.
export function sortNewestFirst(transactions) {
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

// Filters the loaded month. bank: "" (all), "none" (unassigned) or an account id; source: "", MANUAL or IMPORTED.
export function filterTransactions(transactions, { search = '', type = '', bank = '', source = '' } = {}) {
    const text = search.trim().toLowerCase();
    return transactions.filter(t => {
        if (type && t.type !== type) return false;
        if (source && t.origin !== source) return false;
        if (bank === 'none' && t.bankAccountId) return false;
        if (bank && bank !== 'none' && String(t.bankAccountId) !== bank) return false;
        if (text && !`${t.description} ${t.category} ${t.bankAccountName ?? ''}`.toLowerCase().includes(text)) return false;
        return true;
    });
}

// What the user may do with an entry, mirroring the backend's rules so the page never offers an
// action the server will refuse.
export function allowedActions(t) {
    return {
        edit: t.origin === 'MANUAL',            // imported events are corrected with a higher CSV source revision
        assignBank: t.type !== 'REFUND',        // refunds always follow their original expense's account
        exclude: true,                          // the server still refuses while active refunds exist
    };
}

// "86.4000" from the API -> "86.40" for an input in a 2-decimal currency
export function amountForInput(amount, digits) {
    return fromMinorUnits(toMinorUnits(amount, digits), digits);
}

// Body for POST /api/transactions from the add form.
export function createPayload(form, currency) {
    const isRefund = form.type === 'REFUND';
    return {
        description: form.description.trim(),
        amount: form.amount,
        type: form.type,
        category: form.category.trim(),
        date: form.date,
        currency,
        refundOf: isRefund ? Number(form.refundOf) : null,
        // A refund always uses its original expense's account, so none is sent
        bankAccountId: isRefund || !form.bankAccountId ? null : Number(form.bankAccountId),
    };
}

// Body for PUT /api/transactions/{id}. The server REPLACES every field with what it receives, so this
// starts from the stored entry and changes only what the form edits. Without this, saving an edit could
// silently erase the entry's bank account, refund link or account reference.
export function updatePayload(original, form) {
    const isRefund = original.type === 'REFUND';
    return {
        description: form.description.trim(),
        amount: form.amount,
        type: isRefund ? 'REFUND' : form.type,
        category: form.category.trim(),
        date: form.date,
        currency: original.currency,
        accountRef: original.accountRef,
        refundOf: original.refundOf ?? null,
        bankAccountId: isRefund
            ? original.bankAccountId ?? null
            : (form.bankAccountId ? Number(form.bankAccountId) : null),
    };
}
