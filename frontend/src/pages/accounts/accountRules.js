// Bank-account entries are labels for grouping transactions, not live bank connections.
// Rules mirror CreateAccountRequest on the backend.

export const ACCOUNT_TYPES = { CHECKING: 'Checking', SAVINGS: 'Savings', CREDIT: 'Credit', CASH: 'Cash' };

export const accountTypeLabel = type => ACCOUNT_TYPES[type] ?? type;

export function accountErrors({ name, currency }) {
    const errors = {};
    const trimmed = name.trim();
    if (!trimmed) errors.name = 'Enter an account name.';
    else if (trimmed.length > 100) errors.name = 'Use at most 100 characters.';
    if (!/^[A-Z]{3}$/.test(currency)) errors.currency = 'Choose a currency.';
    return errors;
}

export const accountBody = ({ name, type, currency }) => ({ name: name.trim(), type, currency });

export const sortAccounts = accounts =>
    [...accounts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
