import { useState } from 'react';
import CurrencySelector from '../../components/ui/CurrencySelector';
import { ACCOUNT_TYPES, accountBody, accountErrors } from './accountRules';

// Add a bank-account label (POST /api/accounts). No bank login or account number is asked for.
export default function AccountForm({ currencies, busy, error, onSave, onCancel }) {
    const [form, setForm] = useState({ name: '', type: 'CHECKING', currency: 'USD' });
    const [errors, setErrors] = useState({});
    const set = (key, value) => {
        setForm(f => ({ ...f, [key]: value }));
        setErrors(e => ({ ...e, [key]: '' }));
    };

    function submit(event) {
        event.preventDefault();
        const next = accountErrors(form);
        setErrors(next);
        if (!Object.keys(next).length) onSave(accountBody(form));
    }

    return (
        <form onSubmit={submit} noValidate>
            <div className="form-grid">
                <div className="field account-form__name">
                    <label htmlFor="account-name">Account name</label>
                    <input id="account-name" value={form.name} maxLength={100} disabled={busy} autoComplete="off"
                        placeholder="e.g. Everyday checking" aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'account-name-error' : undefined}
                        onChange={e => set('name', e.target.value)} />
                    {errors.name && <p className="field__error" id="account-name-error">{errors.name}</p>}
                </div>
                <div className="field">
                    <label htmlFor="account-type">Account type</label>
                    <select id="account-type" value={form.type} disabled={busy} onChange={e => set('type', e.target.value)}>
                        {Object.entries(ACCOUNT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>
                <CurrencySelector value={form.currency} onChange={value => set('currency', value)} currencies={currencies} disabled={busy} />
            </div>
            {errors.currency && <p className="form-error" role="alert">{errors.currency}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Add account'}</button>
            </div>
        </form>
    );
}
