import { useState } from 'react';

// Create a monthly category budget (POST /api/budgets) for the selected month and currency.
// categories suggests names already used this month; the server rejects a duplicate category.
// initialCategory pre-fills the category, e.g. when setting a budget for unbudgeted spending.
export default function BudgetForm({ month, currency, step, categories = [], initialCategory = '', busy, error, onSave, onCancel }) {
    const [category, setCategory] = useState(initialCategory);
    const [monthlyLimit, setMonthlyLimit] = useState('');

    function submit(event) {
        event.preventDefault();
        const [year, monthNumber] = month.split('-').map(Number);
        onSave({ category: category.trim(), monthlyLimit, currency, month: monthNumber, year });
    }

    return (
        <form onSubmit={submit}>
            <div className="form-grid">
                <div className="field">
                    <label htmlFor="budget-category">Category</label>
                    <input id="budget-category" list="budget-categories" value={category} onChange={e => setCategory(e.target.value)}
                        maxLength={100} required disabled={busy} autoComplete="off" />
                    <datalist id="budget-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="field">
                    <label htmlFor="budget-limit">Monthly limit ({currency})</label>
                    <input id="budget-limit" type="number" inputMode="decimal" min={step} step={step}
                        value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} required disabled={busy} />
                </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Add budget'}</button>
            </div>
        </form>
    );
}
