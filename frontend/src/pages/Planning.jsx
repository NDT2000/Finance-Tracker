import AppHeader from '../components/AppHeader';
import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import './Pipeline.css';
import './Planning.css';

const currentMonth = () => new Date().toISOString().slice(0, 7);
function offsetMonth(start, offset) {
    const [year, month] = start.split('-').map(Number); const total = year * 12 + month - 1 + offset;
    return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String(total % 12 + 1).padStart(2, '0')}`;
}
const newPlan = () => ({ name: '', currency: 'USD', startMonth: currentMonth(), months: 12, openingCash: '0', openingInvestments: '0', cashReserve: '0', annualReturnPercent: '0' });
const kinds = { INCOME: 'Salary / other income', EXPENSE: 'Spending', INVESTMENT: 'Investment contribution', LOAN_REPAYMENT: 'Loan repayment', WITHDRAWAL: 'Investment withdrawal' };
const newEvent = months => ({ name: '', kind: 'INCOME', recurrence: 'MONTHLY', amount: '', firstMonth: 1, lastMonth: months });

export default function Planning() {
    const [plans, setPlans] = useState([]); const [selected, setSelected] = useState('');
    const [storedPlan, setPlan] = useState(null); const [events, setEvents] = useState([]); const [storedProjection, setProjection] = useState(null);
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const [form, setForm] = useState(newPlan); const [editingPlan, setEditingPlan] = useState(false);
    const [event, setEvent] = useState(newEvent(12)); const [editingEvent, setEditingEvent] = useState(null);
    const [baseline, setBaseline] = useState(() => offsetMonth(currentMonth(), -1));
    const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(null); const sequence = useRef(0); const selection = useRef(''); const baselineRef = useRef(baseline);
    selection.current = selected; baselineRef.current = baseline;
    const plan = storedPlan?.id === selected ? storedPlan : null;
    const projection = storedProjection?.plan.id === selected ? storedProjection : null;
    const money = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: plan?.currency || form.currency }).format(value);
    const digits = currencies.find(c => c.code === (editingPlan || !selected ? form.currency : plan?.currency))?.digits ?? 2;
    const step = digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`;

    async function load(id = selection.current) {
        const request = ++sequence.current; const chosenBaseline = baselineRef.current;
        try {
            const { data } = await api.get('/api/plans');
            if (request !== sequence.current) return;
            setPlans(data);
            if (!id) { setLoading(false); return; }
            const [detail, rows, forecast] = await Promise.all([api.get(`/api/plans/${id}`), api.get(`/api/plans/${id}/events`), api.get(`/api/plans/${id}/projection?baselineMonth=${chosenBaseline}`)]);
            if (request !== sequence.current || selection.current !== id || baselineRef.current !== chosenBaseline) return;
            setPlan(detail.data); setEvents(rows.data); setProjection(forecast.data);
        } catch (err) { if (request === sequence.current) setError(err.response?.data?.message || 'Financial plans could not be loaded. Please try again.'); }
        finally { if (request === sequence.current) setLoading(false); }
    }
    useEffect(() => { api.get('/api/analytics/currencies').then(r => setCurrencies(r.data)).catch(() => {}); }, []);
    useEffect(() => { setLoading(true); setError(''); setPlan(null); setProjection(null); setEvents([]); setEditingEvent(null); setConfirm(null); setEditingPlan(false); setEvent(newEvent(12)); load(selected); }, [selected]);
    useEffect(() => { if (selected) { setLoading(true); setError(''); load(selected); } }, [baseline]);
    useEffect(() => { if (plan && !editingEvent) setEvent(newEvent(plan.months)); }, [plan?.id, plan?.months]);

    async function savePlan(e) {
        e.preventDefault(); setBusy(true); setError('');
        try {
            const body = { ...form, months: Number(form.months) };
            const { data } = selected ? await api.put(`/api/plans/${selected}`, body) : await api.post('/api/plans', body);
            setEditingPlan(false); setSelected(data.id); selection.current = data.id; await load(data.id);
        } catch (err) { setError(err.response?.data?.message || 'The plan could not be saved.'); }
        finally { setBusy(false); }
    }
    async function saveEvent(e) {
        e.preventDefault(); setBusy(true); setError('');
        try {
            const body = { ...event, firstMonth: Number(event.firstMonth), lastMonth: event.recurrence === 'ONCE' ? Number(event.firstMonth) : Number(event.lastMonth) };
            if (editingEvent) await api.put(`/api/plans/${selected}/events/${editingEvent}`, body);
            else await api.post(`/api/plans/${selected}/events`, body);
            setEditingEvent(null); setEvent(newEvent(plan.months)); await load();
        } catch (err) { setError(err.response?.data?.message || 'The planned event could not be saved.'); }
        finally { setBusy(false); }
    }
    async function copy() {
        setBusy(true); setError('');
        try { const { data } = await api.post(`/api/plans/${selected}/copy`); setSelected(data.id); }
        catch (err) { setError(err.response?.data?.message || 'The plan could not be copied.'); }
        finally { setBusy(false); }
    }
    async function remove() {
        setBusy(true); setError('');
        try {
            if (confirm.kind === 'plan') { await api.delete(`/api/plans/${selected}`); setSelected(''); setForm(newPlan()); }
            else { await api.delete(`/api/plans/${selected}/events/${confirm.id}`); if (editingEvent === confirm.id) { setEditingEvent(null); setEvent(newEvent(plan.months)); } await load(); }
            setConfirm(null);
        } catch (err) { setError(err.response?.data?.message || 'The item could not be deleted.'); }
        finally { setBusy(false); }
    }
    const plot = (projection?.months || []).map(row => ({ month: row.month, cash: Number(row.closingCash), investments: Number(row.closingInvestments) }));
    return <div className="pipeline-page planning-page"><AppHeader />
        <main><h1>Financial planning</h1><p>Try salary changes, spending, investments, loan payments and withdrawals before changing your real finances.</p>
            <p className="pipeline-help">Plans are saved what-if scenarios. They never create transactions or change your bank accounts, dashboard totals or existing spending forecast.</p>
            {error && <p className="pipeline-error" role="alert">{error}</p>}
            <div className="pipeline-controls"><label htmlFor="plan-choice">Saved scenario<select id="plan-choice" value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); if (!e.target.value) setForm(newPlan()); }}>
                <option value="">Create a new scenario</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency}, {p.startMonth})</option>)}
            </select></label><button disabled={busy} onClick={() => { setSelected(''); setForm(newPlan()); }}>New scenario</button>
                {plan && <><button disabled={busy} onClick={() => { setForm({ ...plan }); setEditingPlan(true); }}>Edit assumptions</button><button disabled={busy} onClick={copy}>Copy scenario</button><button disabled={busy} onClick={() => setConfirm({ kind: 'plan', name: plan.name })}>Delete scenario</button></>}
            </div>
            {loading && <p role="status">Loading your plan…</p>}
            {confirm && <section className="pipeline-card"><p>Delete “{confirm.name}”{confirm.kind === 'plan' ? ' and its planned events' : ''}?</p><button disabled={busy} onClick={remove}>Confirm deletion</button><button disabled={busy} onClick={() => setConfirm(null)}>Cancel deletion</button></section>}
            {(!selected || editingPlan) && <section className="pipeline-card"><h2>{selected ? 'Edit plan assumptions' : 'Create a scenario'}</h2>
                <form className="planning-fields" onSubmit={savePlan}>
                    <label>Scenario name<input required maxLength={100} value={form.name} disabled={busy} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
                    <label>Plan currency<select value={form.currency} disabled={busy || (selected && events.length > 0)} onChange={e => setForm({ ...form, currency: e.target.value })}>{currencies.map(c => <option key={c.code}>{c.code}</option>)}</select></label>
                    <label>Starting month<input type="month" required value={form.startMonth} disabled={busy} onChange={e => setForm({ ...form, startMonth: e.target.value })}/></label>
                    <label>Number of months<input type="number" min="1" max="36" required value={form.months} disabled={busy} onChange={e => setForm({ ...form, months: e.target.value })}/></label>
                    <label>Opening cash<input type="number" step={step} required value={form.openingCash} disabled={busy} onChange={e => setForm({ ...form, openingCash: e.target.value })}/></label>
                    <label>Opening investments<input type="number" min="0" step={step} required value={form.openingInvestments} disabled={busy} onChange={e => setForm({ ...form, openingInvestments: e.target.value })}/></label>
                    <label>Minimum cash reserve<input type="number" min="0" step={step} required value={form.cashReserve} disabled={busy} onChange={e => setForm({ ...form, cashReserve: e.target.value })}/></label>
                    <label>Annual investment growth assumption (%)<input type="number" min="-100" max="100" step="0.0001" required value={form.annualReturnPercent} disabled={busy} onChange={e => setForm({ ...form, annualReturnPercent: e.target.value })}/></label>
                    <button className="planning-primary" disabled={busy} type="submit">Save scenario</button>{selected && <button disabled={busy} type="button" onClick={() => setEditingPlan(false)}>Cancel assumptions</button>}
                </form><p className="pipeline-help">Enter known starting amounts; recorded income minus expenses is not a bank balance. Growth uses the annual percentage divided by 12 each month, rounded to currency precision. It is an editable assumption, not guaranteed income or a cash deposit.</p>
            </section>}
            {plan && projection && <>
                <div className="pipeline-stats">{[['Projected closing cash', projection.closingCash], ['Projected investments', projection.closingInvestments], ['Lowest modeled cash', projection.minimumCash], ['Estimated investment growth', projection.totalInvestmentGrowth]].map(([label, value]) => <div className="pipeline-stat" key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div>
                <section className="pipeline-card"><h2>Funding checks</h2>
                    <p>{projection.firstCashShortfall ? `Cash becomes negative in ${projection.firstCashShortfall}. Adjust income, spending or planned contributions.` : 'No negative month-end cash in this scenario.'}</p>
                    <p>{projection.firstBelowReserve ? `Cash falls below your reserve in ${projection.firstBelowReserve}.` : 'Month-end cash stays at or above your reserve.'}</p>
                    {Number(projection.totalUnfundedWithdrawals) > 0 && <p className="pipeline-error" role="status">{money(projection.totalUnfundedWithdrawals)} of requested withdrawals cannot be funded. Only available investment value is added to cash.</p>}
                    <p className="pipeline-help">This is a month-end model. Events inside a month are combined, contributions precede withdrawals, and growth applies afterwards. Loan repayments are cash payments; remaining loan principal, taxes and fees are not calculated.</p>
                </section>
                <section className="pipeline-card"><h2>Planned events</h2><form className="planning-fields" onSubmit={saveEvent}>
                    <label>Event name<input required maxLength={100} value={event.name} disabled={busy} onChange={e => setEvent({ ...event, name: e.target.value })}/></label>
                    <label>Event type<select value={event.kind} disabled={busy} onChange={e => setEvent({ ...event, kind: e.target.value })}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label>Event amount<input type="number" min={step} step={step} required value={event.amount} disabled={busy} onChange={e => setEvent({ ...event, amount: e.target.value })}/></label>
                    <label>Repeat<select value={event.recurrence} disabled={busy} onChange={e => setEvent({ ...event, recurrence: e.target.value })}><option value="MONTHLY">Every month in range</option><option value="ONCE">One time</option></select></label>
                    <label>First month (1–{plan.months})<input type="number" min="1" max={plan.months} required value={event.firstMonth} disabled={busy} onChange={e => setEvent({ ...event, firstMonth: e.target.value })}/></label>
                    {event.recurrence === 'MONTHLY' && <label>Last month (1–{plan.months})<input type="number" min={event.firstMonth} max={plan.months} required value={event.lastMonth} disabled={busy} onChange={e => setEvent({ ...event, lastMonth: e.target.value })}/></label>}
                    <button className="planning-primary" type="submit" disabled={busy}>{editingEvent ? 'Save event changes' : 'Add planned event'}</button>{editingEvent && <button disabled={busy} type="button" onClick={() => { setEditingEvent(null); setEvent(newEvent(plan.months)); }}>Cancel event edit</button>}
                </form>
                    {!!events.length && <div className="pipeline-table"><table><thead><tr><th>Event</th><th>Type</th><th>Amount</th><th>Schedule</th><th>Actions</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{e.name}</td><td>{kinds[e.kind]}</td><td>{money(e.amount)}</td><td>{offsetMonth(plan.startMonth, e.firstMonth - 1)}{e.recurrence === 'MONTHLY' && ` → ${offsetMonth(plan.startMonth, e.lastMonth - 1)}`}</td><td><button disabled={busy} onClick={() => { setEvent({ ...e }); setEditingEvent(e.id); }}>Edit {e.name}</button><button disabled={busy} onClick={() => setConfirm({ kind: 'event', id: e.id, name: e.name })}>Delete {e.name}</button></td></tr>)}</tbody></table></div>}
                </section>
                <section className="pipeline-card"><h2>Projected cash and investments</h2><ResponsiveContainer width="100%" height={300}><LineChart data={plot}><XAxis dataKey="month"/><YAxis/><Tooltip formatter={money}/><Legend/><ReferenceLine y={Number(plan.cashReserve)} stroke="#d97706"/><Line dataKey="cash" name="Cash" stroke="#4f46e5"/><Line dataKey="investments" name="Investments" stroke="#059669"/></LineChart></ResponsiveContainer></section>
                <section className="pipeline-card"><h2>Compare with recorded finances</h2><label htmlFor="baseline-month">Actual comparison month<input id="baseline-month" type="month" value={baseline} disabled={busy} onChange={e => { if (e.target.value) setBaseline(e.target.value); }}/></label>
                    <p>{projection.actualBaseline.month !== baseline ? 'Refreshing recorded comparison…' : <>{projection.actualBaseline.transactionCount} recorded entries in {projection.actualBaseline.month}, {plan.currency}: income {money(projection.actualBaseline.income)}, net spending {money(projection.actualBaseline.netExpenses)}, net cash flow {money(projection.actualBaseline.netSavings)}.</>}</p>
                    <p className="pipeline-help">These recorded values are a reference only. They are not repeated or added to your scenario automatically. Investment contributions reduce modeled cash but increase modeled investments; do not count them again as spending.</p>
                </section>
                <section className="pipeline-card"><h2>Monthly projection</h2><div className="pipeline-table"><table><thead><tr><th>Month</th><th>Income</th><th>Spending</th><th>Loan payments</th><th>Invested</th><th>Funded withdrawals</th><th>Unfunded withdrawals</th><th>Growth</th><th>Closing cash</th><th>Investment value</th></tr></thead><tbody>{projection.months.map(row => <tr key={row.month}><td>{row.month}{row.cashShortfall ? <small>Cash shortfall</small> : row.belowReserve && <small>Below reserve</small>}</td>{['income', 'spending', 'loanRepayments', 'investmentContributions', 'fundedWithdrawals', 'unfundedWithdrawals', 'investmentGrowth', 'closingCash', 'closingInvestments'].map(key => <td key={key}>{money(row[key])}</td>)}</tr>)}</tbody></table></div></section>
            </>}
        </main>
    </div>;
}
