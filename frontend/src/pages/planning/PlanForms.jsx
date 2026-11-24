import { useState } from 'react';
import { amountStep } from '../../format';
import { EVENT_KINDS, eventPayload, monthOptions, planPayload } from './planningRules';

// Scenario assumptions. currencyLocked: a plan's currency cannot change once it has events.
export function PlanForm({ initial, currencies, currencyLocked, busy, error, submitLabel, onSave, onCancel }) {
    const [form, setForm] = useState(initial);
    const digits = currencies.find(c => c.code === form.currency)?.digits ?? 2;
    const step = amountStep(digits);
    const update = (field) => (event) => setForm(previous => ({ ...previous, [field]: event.target.value }));

    return (
        <form onSubmit={(event) => { event.preventDefault(); onSave(planPayload(form)); }}>
            <div className="form-grid">
                <div className="field field--wide">
                    <label htmlFor="plan-name">Scenario name</label>
                    <input id="plan-name" value={form.name} onChange={update('name')} maxLength={100} required disabled={busy}
                        placeholder="e.g. Move to a bigger flat" autoComplete="off" />
                </div>
                <div className="field">
                    <label htmlFor="plan-currency">Currency</label>
                    <select id="plan-currency" value={form.currency} onChange={update('currency')} disabled={busy || currencyLocked}>
                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    {currencyLocked && <p className="field__hint">Fixed once the scenario has events.</p>}
                </div>
                <div className="field">
                    <label htmlFor="plan-start">Starting month</label>
                    <input id="plan-start" type="month" value={form.startMonth} onChange={update('startMonth')} required disabled={busy} />
                </div>
                <div className="field">
                    <label htmlFor="plan-months">Planning horizon (months)</label>
                    <input id="plan-months" type="number" min="1" max="36" value={form.months} onChange={update('months')} required disabled={busy} />
                    <p className="field__hint">1 to 36 months.</p>
                </div>
                <div className="field">
                    <label htmlFor="plan-return">Annual investment growth (%)</label>
                    <input id="plan-return" type="number" min="-100" max="100" step="0.0001" value={form.annualReturnPercent}
                        onChange={update('annualReturnPercent')} required disabled={busy} />
                </div>
                <div className="field">
                    <label htmlFor="plan-cash">Opening cash</label>
                    <input id="plan-cash" type="number" step={step} value={form.openingCash} onChange={update('openingCash')} required disabled={busy} />
                </div>
                <div className="field">
                    <label htmlFor="plan-investments">Opening investments</label>
                    <input id="plan-investments" type="number" min="0" step={step} value={form.openingInvestments} onChange={update('openingInvestments')} required disabled={busy} />
                </div>
                <div className="field field--wide">
                    <label htmlFor="plan-reserve">Minimum cash reserve</label>
                    <input id="plan-reserve" type="number" min="0" step={step} value={form.cashReserve} onChange={update('cashReserve')} required disabled={busy} />
                </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
            </div>
        </form>
    );
}

// One planned event. editing: the stored event, or null to add one.
export function EventForm({ plan, digits, editing, busy, error, onSave, onCancel }) {
    const [form, setForm] = useState(() => editing
        ? { ...editing, firstMonth: String(editing.firstMonth), lastMonth: String(editing.lastMonth) }
        : { name: '', kind: 'INCOME', recurrence: 'MONTHLY', amount: '', firstMonth: '1', lastMonth: String(plan.months) });
    const options = monthOptions(plan);
    const update = (field) => (event) => setForm(previous => ({ ...previous, [field]: event.target.value }));
    const kind = EVENT_KINDS[form.kind];

    function chooseFirst(event) {
        const value = event.target.value;
        // Keep the range valid: the last month can't come before the first
        setForm(previous => ({ ...previous, firstMonth: value, lastMonth: Number(previous.lastMonth) < Number(value) ? value : previous.lastMonth }));
    }

    return (
        <form onSubmit={(event) => { event.preventDefault(); onSave(eventPayload(form)); }}>
            <div className="form-grid">
                <div className="field field--wide">
                    <label htmlFor="event-kind">Type</label>
                    <select id="event-kind" value={form.kind} onChange={update('kind')} disabled={busy} aria-describedby="event-kind-effect">
                        {Object.entries(EVENT_KINDS).map(([value, k]) => <option key={value} value={value}>{k.label}</option>)}
                    </select>
                    <p className="field__hint" id="event-kind-effect">{kind.effect}.</p>
                </div>
                <div className="field field--wide">
                    <label htmlFor="event-name">Name</label>
                    <input id="event-name" value={form.name} onChange={update('name')} maxLength={100} required disabled={busy}
                        placeholder="e.g. Salary, Rent, New laptop" autoComplete="off" />
                </div>
                <div className="field">
                    <label htmlFor="event-amount">Amount ({plan.currency})</label>
                    <input id="event-amount" type="number" inputMode="decimal" min={amountStep(digits)} step={amountStep(digits)}
                        value={form.amount} onChange={update('amount')} required disabled={busy} />
                </div>
                <div className="field">
                    <label htmlFor="event-recurrence">How often</label>
                    <select id="event-recurrence" value={form.recurrence} onChange={update('recurrence')} disabled={busy}>
                        <option value="MONTHLY">Every month in a range</option>
                        <option value="ONCE">Once</option>
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="event-first">{form.recurrence === 'ONCE' ? 'Month' : 'From'}</label>
                    <select id="event-first" value={form.firstMonth} onChange={chooseFirst} disabled={busy}>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                {form.recurrence === 'MONTHLY' && (
                    <div className="field">
                        <label htmlFor="event-last">Until</label>
                        <select id="event-last" value={form.lastMonth} onChange={update('lastMonth')} disabled={busy}>
                            {options.filter(o => o.value >= Number(form.firstMonth)).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                )}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save event' : 'Add event'}</button>
            </div>
        </form>
    );
}
