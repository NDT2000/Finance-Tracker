import { useId } from 'react';
import './ui.css';

// Currency picker. currencies comes from GET /api/analytics/currencies: [{ code: 'USD', digits: 2 }, ...].
// Totals are never combined across currencies, so pages always show one currency at a time.
export default function CurrencySelector({ value, onChange, currencies, label = 'Currency', disabled = false }) {
    const id = useId();
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
                {currencies.map(({ code }) => <option key={code} value={code}>{code}</option>)}
            </select>
        </div>
    );
}
