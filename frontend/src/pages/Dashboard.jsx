import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Pipeline.css';
import TransactionExport from './TransactionExport';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);
export default function Dashboard() {
    const { user, logout, token } = useAuth(); const navigate = useNavigate();
    const [month, setMonth] = useState(currentMonth()); const [currency, setCurrency] = useState('USD');
    const [accounts, setAccounts] = useState([]); const [assigning, setAssigning] = useState(null); const [assignmentBank, setAssignmentBank] = useState('');
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const requestSequence = useRef(0); const assignmentRef = useRef(null);
    const [storedSummary, setSummary] = useState(null); const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]); const [forecasts, setForecasts] = useState([]);
    const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
    const [showTransaction, setShowTransaction] = useState(false); const [showBudget, setShowBudget] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', category: 'Food', type: 'EXPENSE', date: today(), refundOf: '', bankAccountId: '' });
    const [budget, setBudget] = useState({ category: 'Food', monthlyLimit: '' });
    const summary = storedSummary?.month === month && storedSummary?.currency === currency ? storedSummary : null;
    const money = value => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
    const digits = currencies.find(c => c.code === currency)?.digits ?? 2;
    const step = digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`;
    async function load() {
        const request = ++requestSequence.current;
        setError(''); setForecasts([]);
        try {
            const period = `month=${encodeURIComponent(month)}&currency=${currency}`;
            const [stats, entries, limits, banks] = await Promise.all([api.get(`/api/analytics/monthly?${period}`), api.get(`/api/transactions?${period}`), api.get('/api/budgets'), api.get('/api/accounts')]);
            if (request !== requestSequence.current) return;
            setSummary(stats.data); setTransactions(entries.data); setAccounts(banks.data);
            const selected = limits.data.filter(b => b.currency === currency && b.month === Number(month.slice(5)) && b.year === Number(month.slice(0, 4)));
            setBudgets(selected);
            if (month === currentMonth()) {
                const values = await Promise.all(selected.map(async b => {
                    try { const { data } = await api.get(`/api/forecast/${encodeURIComponent(b.category)}?budgetLimit=${b.monthlyLimit}&currency=${currency}`); return { category: b.category, data }; }
                    catch { return { category: b.category, data: null }; }
                }));
                if (request === requestSequence.current) setForecasts(values);
            } else setForecasts([]);
        } catch { if (request === requestSequence.current) setError('Your dashboard could not be refreshed. Please try again.'); }
        finally { if (request === requestSequence.current) setLoading(false); }
    }
    useEffect(() => { if (assigning) assignmentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [assigning]);
    useEffect(() => { api.get('/api/analytics/currencies').then(r => setCurrencies(r.data)).catch(() => {}); }, []);
    useEffect(() => { if (token) { setLoading(true); setForm(previous => ({ ...previous, bankAccountId: '' })); setAssigning(null); load(); } }, [token, month, currency]);
    async function submit(event, isBudget) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            if (isBudget) {
                await api.post('/api/budgets', { ...budget, monthlyLimit: budget.monthlyLimit, currency, month: Number(month.slice(5)), year: Number(month.slice(0, 4)) }); setShowBudget(false);
            } else {
                await api.post('/api/transactions', { ...form, amount: form.amount, currency, bankAccountId: form.type === 'REFUND' || !form.bankAccountId ? null : Number(form.bankAccountId), refundOf: form.type === 'REFUND' ? Number(form.refundOf) : null });
                setShowTransaction(false); setForm({ ...form, amount: '', description: '', refundOf: '' });
            }
            await load();
        } catch (err) { setError(err.response?.data?.message || 'The entry could not be saved. Please try again.'); }
        finally { setBusy(false); }
    }
    async function exclude(id) {
        setBusy(true); setError('');
        try { await api.delete(`/api/transactions/${id}`); await load(); }
        catch (err) { setError(err.response?.data?.message || 'The entry could not be excluded.'); }
        finally { setBusy(false); }
    }
    async function assignBank(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            await api.put(`/api/transactions/${assigning.id}/bank-account`, { bankAccountId: assignmentBank ? Number(assignmentBank) : null });
            setAssigning(null); await load();
        } catch (err) { setError(err.response?.data?.message || 'The bank account could not be assigned.'); }
        finally { setBusy(false); }
    }
    const categoryData = (summary?.byCategory || []).map(c => ({ category: c.category, spent: Number(c.amount) }));
    const budgetData = budgets.map(b => ({ category: b.category, budget: Number(b.monthlyLimit), spent: Number(summary?.byCategory.find(c => c.category === b.category)?.amount || 0) }));
    const dailyData = (summary?.byDay || []).map(d => ({ date: d.date, amount: Number(d.amount) }));
    const pieData = summary ? [{ name: 'Income', value: Number(summary.income) }, { name: 'Net expenses', value: Number(summary.netExpenses) }].filter(d => d.value > 0) : [];
    const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 10);
    return <div className="pipeline-page"><header><Link to="/dashboard">Finance Tracker</Link><nav>
        <span>Hi, {user?.fullName}</span><Link to="/imports">Batch imports</Link><Link to="/profile">My profile</Link>
        <button onClick={async () => { try { await logout(); navigate('/login'); } catch { setError('Logout failed. Please try again.'); } }}>Logout</button>
    </nav></header><main><h1>Your finances</h1>
        <div className="pipeline-controls"><label>Month<input type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }}/></label>
            <label>Currency<select value={currency} onChange={e => setCurrency(e.target.value)}>{currencies.map(c => <option key={c.code}>{c.code}</option>)}</select></label>
            <button onClick={load}>Refresh dashboard</button></div>
        {error && <p role="alert" className="pipeline-error">{error}</p>}
        {loading && <p role="status">Loading your dashboard…</p>}
        {summary && <>
            <div className="pipeline-stats">{[['Total Income', summary.income], ['Total Expenses (net of refunds)', summary.netExpenses], ['Net Savings', summary.netSavings], ['Refunds', summary.refunds]].map(([label, value]) =>
                <div key={label} className="pipeline-stat"><span>{label}</span><strong>{money(value)}</strong></div>)}
                {forecasts.map(f => <div className="pipeline-stat" key={f.category}><span>{f.category} Forecast</span><strong style={{ fontSize: '1.1rem' }}>{!f.data ? 'Forecast unavailable' : f.data.status === 'ON_TRACK' ? '✓ On track' : `⚠ Over by ${money(f.data.overspend_amount)}`}</strong></div>)}
            </div>
            <p className="pipeline-help">{summary.transactionCount} canonical entries · Ledger queried {new Date(summary.asOf).toLocaleString()} · Latest applied import: {summary.imports.latest_import_at ? new Date(summary.imports.latest_import_at).toLocaleString() : 'none'}.
                {` ${summary.imports.pending_jobs} imports pending, ${summary.imports.review_jobs} awaiting review, ${summary.imports.failed_jobs} failed.`} Pending/review rows are not included. Net savings is not a bank-account balance. Currencies are never combined.</p>
        </>}
        <div className="pipeline-actions"><button onClick={() => setShowTransaction(!showTransaction)}>{showTransaction ? 'Cancel transaction' : '+ Add Transaction'}</button><button onClick={() => setShowBudget(!showBudget)}>{showBudget ? 'Cancel budget' : '+ Add Budget'}</button></div>
        {showTransaction && <section className="pipeline-card"><h2>Add transaction ({currency})</h2><form className="pipeline-form" onSubmit={e => submit(e, false)}>
            {form.type !== 'REFUND' ? <label htmlFor="transaction-bank">Bank account<select id="transaction-bank" value={form.bankAccountId}
                onChange={e => setForm({ ...form, bankAccountId: e.target.value })}>
                <option value="">Unassigned</option>{accounts.filter(a => a.currency === currency).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select><small>Add bank accounts in My profile. Only {currency} accounts are shown.</small></label> : <p className="pipeline-help">The refund uses its original expense's bank account automatically.</p>}
            <label>Description<input value={form.description} maxLength={255} required onChange={e => setForm({ ...form, description: e.target.value })}/></label>
            <label>Amount<input type="number" min={step} step={step} value={form.amount} required onChange={e => setForm({ ...form, amount: e.target.value })}/></label>
            <label>Type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>EXPENSE</option><option>INCOME</option><option>REFUND</option></select></label>
            <label>Category<input value={form.category} maxLength={100} required onChange={e => setForm({ ...form, category: e.target.value })}/></label>
            <label>Date<input type="date" value={form.date} required onChange={e => setForm({ ...form, date: e.target.value })}/></label>
            {form.type === 'REFUND' && <label>Original expense ledger ID<input type="number" min="1" value={form.refundOf} required onChange={e => setForm({ ...form, refundOf: e.target.value })}/></label>}
            <button disabled={busy} type="submit">Save transaction</button></form></section>}
        {showBudget && <section className="pipeline-card"><h2>Add budget ({month}, {currency})</h2><form className="pipeline-form" onSubmit={e => submit(e, true)}>
            <label>Category<input value={budget.category} maxLength={100} required onChange={e => setBudget({ ...budget, category: e.target.value })}/></label>
            <label>Monthly limit<input type="number" min={step} step={step} value={budget.monthlyLimit} required onChange={e => setBudget({ ...budget, monthlyLimit: e.target.value })}/></label>
            <button disabled={busy} type="submit">Save budget</button></form></section>}
        <TransactionExport accounts={accounts} month={month} currency={currency}/>
        {assigning && <section className="pipeline-card" ref={assignmentRef}><h2>Assign bank account: {assigning.description}</h2><form className="pipeline-form" onSubmit={assignBank}>
            <label htmlFor="assignment-bank">Assign to bank<select id="assignment-bank" value={assignmentBank} disabled={busy} onChange={e => setAssignmentBank(e.target.value)}>
                <option value="">Unassigned</option>{accounts.filter(a => a.currency === assigning.currency).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></label><button type="submit" disabled={busy}>Save bank assignment</button><button type="button" disabled={busy} onClick={() => setAssigning(null)}>Cancel assignment</button>
        </form><p className="pipeline-help">Amounts and source history do not change. Any linked refunds follow this account.</p></section>}
        <div className="pipeline-charts">
            <section className="pipeline-card"><h2>Spending by Category</h2><ResponsiveContainer width="100%" height={250}><BarChart data={categoryData}><XAxis dataKey="category"/><YAxis/><Tooltip formatter={money}/><Bar dataKey="spent" name="Net spending" fill="#6366f1"/></BarChart></ResponsiveContainer></section>
            <section className="pipeline-card"><h2>Spending vs Budget</h2><ResponsiveContainer width="100%" height={250}><BarChart data={budgetData}><XAxis dataKey="category"/><YAxis/><Tooltip formatter={money}/><Legend/><Bar dataKey="spent" fill="#ef4444"/><Bar dataKey="budget" fill="#6366f1"/></BarChart></ResponsiveContainer></section>
            <section className="pipeline-card"><h2>Daily Spending Trend</h2><ResponsiveContainer width="100%" height={250}><LineChart data={dailyData}><XAxis dataKey="date"/><YAxis/><Tooltip formatter={money}/><Line dataKey="amount" name="Net spending" stroke="#6366f1"/></LineChart></ResponsiveContainer></section>
            <section className="pipeline-card"><h2>Income vs Expense</h2><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={85} label>{pieData.map((p, i) => <Cell key={p.name} fill={i ? '#ef4444' : '#22c55e'}/>)}</Pie><Tooltip formatter={money}/><Legend/></PieChart></ResponsiveContainer></section>
        </div>
        <section className="pipeline-card"><h2>Recent Transactions</h2>{!recent.length ? <p>No transactions for this month and currency.</p> : <div className="pipeline-table"><table><thead><tr><th>ID / source</th><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Bank account</th><th>Amount</th><th>Action</th></tr></thead><tbody>
            {recent.map(t => <tr key={t.id}><td>#{t.id}<small>{t.origin}</small>{t.importBatchId && <Link to="/imports">Import history</Link>}</td><td>{t.date}</td><td>{t.description}</td><td>{t.category}</td><td>{t.type}</td><td>{t.bankAccountName || 'Unassigned'}{t.bankAccountName && !t.bankAccountId && <small>Account deleted</small>}{t.type !== 'REFUND' && <button disabled={busy} onClick={() => { setAssigning(t); setAssignmentBank(t.bankAccountId ? String(t.bankAccountId) : ''); }}>Assign account #{t.id}</button>}</td><td>{money(t.amount)}</td><td><button disabled={busy} onClick={() => exclude(t.id)}>Exclude from totals</button></td></tr>)}
        </tbody></table></div>}<p className="pipeline-help">Exclusions retain source history and are not resurrected by repeated imports. Imported corrections use a higher CSV source revision.</p></section>
    </main></div>;
}
