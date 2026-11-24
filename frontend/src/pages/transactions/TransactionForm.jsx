import { useState } from 'react';
import { formatMoney } from '../../format';
import { amountForInput, createPayload, updatePayload } from './transactionRules';

const OTHER_EXPENSE = 'other';

const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Add or edit one transaction. `editing` is the stored entry (edit) or null (add).
// onSave receives the request body built by transactionRules and resolves when the server accepts it.
export default function TransactionForm({ editing, currency, digits, step, accounts, expenses, categories, busy, error, onSave, onCancel }) {
    const isEdit = Boolean(editing);
    const [form, setForm] = useState(() => (isEdit ? {
        description: editing.description,
        amount: amountForInput(editing.amount, digits),
        type: editing.type,
        category: editing.category,
        date: editing.date,
        bankAccountId: editing.bankAccountId ? String(editing.bankAccountId) : '',
        refundOf: editing.refundOf ? String(editing.refundOf) : '',
    } : {
        description: '', amount: '', type: 'EXPENSE', category: '', date: localToday(), bankAccountId: '', refundOf: '',
    }));
    // A refund's original expense: picked from this month's list, or typed as a ledger ID for older ones
    const [refundChoice, setRefundChoice] = useState('');

    const isRefund = form.type === 'REFUND';
    const update = (field) => (event) => setForm(previous => ({ ...previous, [field]: event.target.value }));
    // Only active accounts in this entry's currency can be chosen
    const currencyAccounts = accounts.filter(a => a.currency === (editing?.currency ?? currency));

    function chooseRefundTarget(event) {
        const value = event.target.value;
        setRefundChoice(value);
        setForm(previous => ({ ...previous, refundOf: value === OTHER_EXPENSE ? '' : value }));
    }

    function submit(event) {
        event.preventDefault();
        onSave(isEdit ? updatePayload(editing, form) : createPayload(form, currency));
    }

    return (
        <form onSubmit={submit}>
            <div className="form-grid">
                {isEdit && editing.type === 'REFUND' ? (
                    <div className="field">
                        <span className="field__label">Type</span>
                        <p className="field__static">Refund of expense #{editing.refundOf}</p>
                    </div>
                ) : (
                    <div className="field">
                        <label htmlFor="tx-type">Type</label>
                        <select id="tx-type" value={form.type} onChange={update('type')} disabled={busy}>
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                            {!isEdit && <option value="REFUND">Refund of an expense</option>}
                        </select>
                    </div>
                )}
                <div className="field">
                    <label htmlFor="tx-date">Date</label>
                    <input id="tx-date" type="date" value={form.date} onChange={update('date')} required disabled={busy} />
                </div>

                <div className="field field--wide">
                    <label htmlFor="tx-description">Description</label>
                    <input id="tx-description" value={form.description} onChange={update('description')}
                        maxLength={255} required disabled={busy} autoComplete="off" />
                </div>

                <div className="field">
                    <label htmlFor="tx-amount">Amount ({editing?.currency ?? currency})</label>
                    <input id="tx-amount" type="number" inputMode="decimal" min={step} step={step}
                        value={form.amount} onChange={update('amount')} required disabled={busy} />
                </div>
                <div className="field">
                    <label htmlFor="tx-category">Category</label>
                    <input id="tx-category" list="tx-categories" value={form.category} onChange={update('category')}
                        maxLength={100} required disabled={busy} autoComplete="off" />
                    <datalist id="tx-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>

                {isRefund && !isEdit && (
                    <div className="field field--wide">
                        <label htmlFor="tx-refund-of">Original expense</label>
                        <select id="tx-refund-of" value={refundChoice} onChange={chooseRefundTarget} required disabled={busy}>
                            <option value="" disabled>Choose the expense being refunded</option>
                            {expenses.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.date} · {e.description} · {formatMoney(e.amount, currency)} (#{e.id})
                                </option>
                            ))}
                            <option value={OTHER_EXPENSE}>An expense from another month (enter its ID)</option>
                        </select>
                        {refundChoice === OTHER_EXPENSE && (
                            <input aria-label="Original expense ID" type="number" min="1" placeholder="Ledger ID, e.g. 42"
                                value={form.refundOf} onChange={update('refundOf')} required disabled={busy} />
                        )}
                        <p className="field__hint">A refund reduces that expense&apos;s spending and uses its bank account.</p>
                    </div>
                )}

                {!isRefund && (
                    <div className="field field--wide">
                        <label htmlFor="tx-bank">Bank account</label>
                        <select id="tx-bank" value={form.bankAccountId} onChange={update('bankAccountId')} disabled={busy}>
                            <option value="">Unassigned</option>
                            {currencyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <p className="field__hint">Only {editing?.currency ?? currency} accounts are listed. Manage accounts in My Profile.</p>
                        {isEdit && editing.bankAccountName && !editing.bankAccountId && (
                            <p className="field__error">
                                This entry belonged to the deleted account &ldquo;{editing.bankAccountName}&rdquo;. Saving changes
                                clears that historical label.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                    {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add transaction'}
                </button>
            </div>
        </form>
    );
}
