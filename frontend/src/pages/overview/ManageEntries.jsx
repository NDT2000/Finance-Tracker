import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TransactionExport from '../TransactionExport';
import { formatMoney, formatMonth } from '../../format';
import '../Pipeline.css';

// Adding transactions and budgets, bank assignment, exclusion and CSV export. These workflows move to
// their own Transactions and Budgets pages in rebuild steps 1.4 and 1.5; until then they live here,
// unchanged in behaviour. `panel` ("transaction", "budget" or null) is controlled by the overview so its
// empty states can open a form.
const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const emptyTransaction = () => ({ description: '', amount: '', category: 'Food', type: 'EXPENSE', date: localToday(), refundOf: '', bankAccountId: '' });

export default function ManageEntries({ month, currency, step, accounts, transactions, panel, onPanelChange, onChanged }) {
    const [form, setForm] = useState(emptyTransaction);
    const [budget, setBudget] = useState({ category: 'Food', monthlyLimit: '' });
    const [assigning, setAssigning] = useState(null);
    const [assignmentBank, setAssignmentBank] = useState('');
    const [excluding, setExcluding] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const sectionRef = useRef(null);
    const assignmentRef = useRef(null);

    const currencyAccounts = accounts.filter(a => a.currency === currency);
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const money = (value) => formatMoney(value, currency);

    // A new month or currency resets choices that depended on the old one
    useEffect(() => { setForm(previous => ({ ...previous, bankAccountId: '' })); setAssigning(null); }, [month, currency]);
    useEffect(() => { if (panel) sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [panel]);
    useEffect(() => { if (assigning) assignmentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [assigning]);

    // Runs an API change, refreshes the overview afterwards and shows the server's message on failure
    async function run(change, fallbackMessage) {
        setBusy(true);
        setError('');
        try {
            await change();
            await onChanged();
            return true;
        } catch (err) {
            setError(err.response?.data?.message || fallbackMessage);
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function saveTransaction(event) {
        event.preventDefault();
        const saved = await run(() => api.post('/api/transactions', {
            ...form,
            currency,
            bankAccountId: form.type === 'REFUND' || !form.bankAccountId ? null : Number(form.bankAccountId),
            refundOf: form.type === 'REFUND' ? Number(form.refundOf) : null,
        }), 'The entry could not be saved. Please try again.');
        if (saved) {
            onPanelChange(null);
            setForm(previous => ({ ...previous, amount: '', description: '', refundOf: '' }));
        }
    }

    async function saveBudget(event) {
        event.preventDefault();
        const [year, monthNumber] = month.split('-').map(Number);
        const saved = await run(() => api.post('/api/budgets', { ...budget, currency, month: monthNumber, year }),
            'The budget could not be saved. Please try again.');
        if (saved) onPanelChange(null);
    }

    async function saveAssignment(event) {
        event.preventDefault();
        const saved = await run(() => api.put(`/api/transactions/${assigning.id}/bank-account`, {
            bankAccountId: assignmentBank ? Number(assignmentBank) : null,
        }), 'The bank account could not be assigned.');
        if (saved) setAssigning(null);
    }

    async function confirmExclude() {
        const done = await run(() => api.delete(`/api/transactions/${excluding.id}`), 'The entry could not be excluded.');
        if (done) setExcluding(null);
    }

    return (
        <section className="pipeline-page overview__manage" ref={sectionRef} aria-labelledby="manage-title">
            <h2 id="manage-title" className="overview__section-title">Manage entries</h2>
            <div className="pipeline-actions">
                <button type="button" onClick={() => onPanelChange(panel === 'transaction' ? null : 'transaction')}>
                    {panel === 'transaction' ? 'Cancel transaction' : '+ Add transaction'}
                </button>
                <button type="button" onClick={() => onPanelChange(panel === 'budget' ? null : 'budget')}>
                    {panel === 'budget' ? 'Cancel budget' : '+ Add budget'}
                </button>
            </div>
            {error && <p role="alert" className="pipeline-error">{error}</p>}

            {panel === 'transaction' && (
                <section className="pipeline-card" aria-labelledby="add-transaction-title">
                    <h3 id="add-transaction-title">Add transaction ({currency})</h3>
                    <form className="pipeline-form" onSubmit={saveTransaction}>
                        {form.type !== 'REFUND' ? (
                            <label htmlFor="transaction-bank">Bank account
                                <select id="transaction-bank" value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {currencyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <small>Add bank accounts in My profile. Only {currency} accounts are shown.</small>
                            </label>
                        ) : (
                            <p className="pipeline-help">The refund uses its original expense&apos;s bank account automatically.</p>
                        )}
                        <label>Description
                            <input value={form.description} maxLength={255} required onChange={e => setForm({ ...form, description: e.target.value })} />
                        </label>
                        <label>Amount
                            <input type="number" min={step} step={step} value={form.amount} required onChange={e => setForm({ ...form, amount: e.target.value })} />
                        </label>
                        <label>Type
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                <option value="EXPENSE">Expense</option>
                                <option value="INCOME">Income</option>
                                <option value="REFUND">Refund</option>
                            </select>
                        </label>
                        <label>Category
                            <input value={form.category} maxLength={100} required onChange={e => setForm({ ...form, category: e.target.value })} />
                        </label>
                        <label>Date
                            <input type="date" value={form.date} required onChange={e => setForm({ ...form, date: e.target.value })} />
                        </label>
                        {form.type === 'REFUND' && (
                            <label>Original expense ledger ID
                                <input type="number" min="1" value={form.refundOf} required onChange={e => setForm({ ...form, refundOf: e.target.value })} />
                            </label>
                        )}
                        <button disabled={busy} type="submit">Save transaction</button>
                    </form>
                </section>
            )}

            {panel === 'budget' && (
                <section className="pipeline-card" aria-labelledby="add-budget-title">
                    <h3 id="add-budget-title">Add budget ({formatMonth(month)}, {currency})</h3>
                    <form className="pipeline-form" onSubmit={saveBudget}>
                        <label>Category
                            <input value={budget.category} maxLength={100} required onChange={e => setBudget({ ...budget, category: e.target.value })} />
                        </label>
                        <label>Monthly limit
                            <input type="number" min={step} step={step} value={budget.monthlyLimit} required onChange={e => setBudget({ ...budget, monthlyLimit: e.target.value })} />
                        </label>
                        <button disabled={busy} type="submit">Save budget</button>
                    </form>
                </section>
            )}

            <TransactionExport accounts={accounts} month={month} currency={currency} />

            {assigning && (
                <section className="pipeline-card" ref={assignmentRef} aria-labelledby="assign-title">
                    <h3 id="assign-title">Assign bank account: {assigning.description}</h3>
                    <form className="pipeline-form" onSubmit={saveAssignment}>
                        <label htmlFor="assignment-bank">Assign to bank
                            <select id="assignment-bank" value={assignmentBank} disabled={busy} onChange={e => setAssignmentBank(e.target.value)}>
                                <option value="">Unassigned</option>
                                {accounts.filter(a => a.currency === assigning.currency).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </label>
                        <button type="submit" disabled={busy}>Save bank assignment</button>
                        <button type="button" disabled={busy} onClick={() => setAssigning(null)}>Cancel assignment</button>
                    </form>
                    <p className="pipeline-help">Amounts and source history do not change. Any linked refunds follow this account.</p>
                </section>
            )}

            <section className="pipeline-card" aria-labelledby="entries-title">
                <h3 id="entries-title">All entries this month</h3>
                {!sorted.length ? <p>No transactions for this month and currency.</p> : (
                    <div className="pipeline-table">
                        <table>
                            <thead>
                                <tr><th>ID / source</th><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Bank account</th><th>Amount</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {sorted.map(t => (
                                    <tr key={t.id}>
                                        <td>#{t.id}<small>{t.origin}</small>{t.importBatchId && <Link to="/imports">Import history</Link>}</td>
                                        <td>{t.date}</td>
                                        <td>{t.description}</td>
                                        <td>{t.category}</td>
                                        <td>{t.type}</td>
                                        <td>
                                            {t.bankAccountName || 'Unassigned'}
                                            {t.bankAccountName && !t.bankAccountId && <small>Account deleted</small>}
                                            {t.type !== 'REFUND' && (
                                                <button type="button" disabled={busy}
                                                    onClick={() => { setAssigning(t); setAssignmentBank(t.bankAccountId ? String(t.bankAccountId) : ''); }}>
                                                    Assign account #{t.id}
                                                </button>
                                            )}
                                        </td>
                                        <td className="num">{money(t.amount)}</td>
                                        <td><button type="button" disabled={busy} onClick={() => setExcluding(t)}>Exclude from totals</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="pipeline-help">Exclusions retain source history and are not resurrected by repeated imports. Imported corrections use a higher CSV source revision.</p>
            </section>

            <ConfirmDialog open={Boolean(excluding)} busy={busy} tone="danger"
                title="Exclude this entry from your totals?"
                message={excluding ? `“${excluding.description}” (${money(excluding.amount)}, ${excluding.date}) will no longer count in totals, budgets or forecasts. Its source history is kept, and repeated imports will not bring it back.` : ''}
                confirmLabel="Exclude entry" onConfirm={confirmExclude} onCancel={() => setExcluding(null)} />
        </section>
    );
}
