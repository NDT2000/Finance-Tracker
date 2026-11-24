import { useState } from 'react';
import { amountForInput } from '../transactions/transactionRules';

// Change a budget's monthly limit (PUT /api/budgets/{id}). The server changes only the limit, but the
// request must still be a complete budget, so the stored category, month, year and currency are sent back.
export default function BudgetLimitForm({ budget, digits, step, busy, error, onSave, onCancel }) {
    const [monthlyLimit, setMonthlyLimit] = useState(amountForInput(budget.monthlyLimit, digits));

    function submit(event) {
        event.preventDefault();
        onSave({ category: budget.category, monthlyLimit, month: budget.month, year: budget.year, currency: budget.currency });
    }

    return (
        <form onSubmit={submit}>
            <div className="field">
                <label htmlFor="budget-edit-limit">Monthly limit ({budget.currency})</label>
                <input id="budget-edit-limit" type="number" inputMode="decimal" min={step} step={step}
                    value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} required disabled={busy} />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save limit'}</button>
            </div>
        </form>
    );
}
