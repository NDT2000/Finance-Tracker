import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Download, Plus, Receipt, Search, Upload } from 'lucide-react';
import api from '../api/axios';
import MonthSelector from '../components/ui/MonthSelector';
import CurrencySelector from '../components/ui/CurrencySelector';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import { amountStep, currentMonth, formatMoney, formatMonth } from '../format';
import { filterTransactions, sortNewestFirst } from './transactions/transactionRules';
import TransactionTable from './transactions/TransactionTable';
import TransactionForm from './transactions/TransactionForm';
import { BankAssignForm, ExportForm } from './transactions/SmallForms';
import './transactions/Transactions.css';

const PAGE_SIZE = 50;
const noFilters = { search: '', type: '', bank: '', source: '' };

// The ledger for one month and currency (docs/design-system.md section 13). Every change goes through
// the existing API, and the list reloads afterwards so it always shows what the server stored.
export default function Transactions() {
    const location = useLocation();
    const navigate = useNavigate();
    const [month, setMonth] = useState(location.state?.month ?? currentMonth());
    const [currency, setCurrency] = useState(location.state?.currency ?? 'USD');
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const [data, setData] = useState({ transactions: [], accounts: [], loadedFor: null, error: '' });
    const [filters, setFilters] = useState(noFilters);
    const [visible, setVisible] = useState(PAGE_SIZE);
    // dialog: { kind: 'add' | 'edit' | 'assign' | 'export', transaction? } or null
    const [dialog, setDialog] = useState(location.state?.openAdd ? { kind: 'add' } : null);
    const [excluding, setExcluding] = useState(null);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState(null);
    const latestRequest = useRef(0);

    // Clear the one-off "open the add form" request so a reload doesn't reopen it
    useEffect(() => {
        if (location.state) navigate(location.pathname, { replace: true, state: null });
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        api.get('/api/analytics/currencies').then(({ data: list }) => setCurrencies(list)).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        const request = ++latestRequest.current;
        try {
            const params = { month, currency };
            const [transactions, accounts] = await Promise.all([
                api.get('/api/transactions', { params }),
                api.get('/api/accounts'),
            ]);
            if (request !== latestRequest.current) return;
            setData({ transactions: transactions.data, accounts: accounts.data, loadedFor: `${month}|${currency}`, error: '' });
        } catch {
            if (request === latestRequest.current) setData(previous => ({ ...previous, error: 'Your transactions could not be loaded.' }));
        }
    }, [month, currency]);

    useEffect(() => { load(); }, [load]);
    // A new month or currency starts from the first rows
    useEffect(() => { setVisible(PAGE_SIZE); }, [month, currency, filters]);

    const digits = currencies.find(c => c.code === currency)?.digits ?? 2;
    const isCurrent = data.loadedFor === `${month}|${currency}`;
    const all = useMemo(() => (isCurrent ? sortNewestFirst(data.transactions) : []), [data.transactions, isCurrent]);
    const shown = useMemo(() => filterTransactions(all, filters), [all, filters]);
    const categories = useMemo(() => [...new Set(all.map(t => t.category))].sort(), [all]);
    const expenses = useMemo(() => all.filter(t => t.type === 'EXPENSE'), [all]);
    const filtered = Object.values(filters).some(Boolean);

    function openDialog(kind, transaction) {
        setFormError('');
        setDialog({ kind, transaction });
    }

    // Runs one change; on success closes the dialog, reloads and confirms; on failure shows the server's reason
    async function change(request, successMessage, { undo } = {}) {
        setBusy(true);
        setFormError('');
        try {
            await request();
            setDialog(null);
            setExcluding(null);
            await load();
            setNotice({ message: successMessage, undo });
            return true;
        } catch (err) {
            setFormError(err.response?.data?.message || 'That change could not be saved. Please try again.');
            return false;
        } finally {
            setBusy(false);
        }
    }

    const saveNew = (body) => change(() => api.post('/api/transactions', body), `Added “${body.description}”.`);
    const saveEdit = (body) => change(() => api.put(`/api/transactions/${dialog.transaction.id}`, body), `Saved changes to “${body.description}”.`);
    const saveAccount = (bankAccountId) => change(
        () => api.put(`/api/transactions/${dialog.transaction.id}/bank-account`, { bankAccountId }),
        `Updated the account for “${dialog.transaction.description}”.`,
    );
    const exclude = () => {
        const t = excluding;
        return change(() => api.delete(`/api/transactions/${t.id}`), `Excluded “${t.description}” from your totals.`, {
            undo: () => change(() => api.post(`/api/transactions/${t.id}/restore`), `Restored “${t.description}”.`),
        });
    };

    return (
        <div className="page">
            <div className="page__head">
                <div>
                    <h1 className="page__title">Transactions</h1>
                    <p className="page__subtitle">{formatMonth(month)} · {currency}</p>
                </div>
                <div className="page__actions">
                    <Link to="/imports" className="btn btn--secondary"><Upload size={16} aria-hidden="true" /> Import CSV</Link>
                    <button type="button" className="btn btn--secondary" onClick={() => openDialog('export')}>
                        <Download size={16} aria-hidden="true" /> Download CSV
                    </button>
                    <button type="button" className="btn btn--primary" onClick={() => openDialog('add')}>
                        <Plus size={16} aria-hidden="true" /> Add transaction
                    </button>
                </div>
            </div>

            <div className="card tx-filters">
                <MonthSelector value={month} onChange={setMonth} />
                <CurrencySelector value={currency} onChange={setCurrency} currencies={currencies} />
                <div className="field tx-filters__search">
                    <label htmlFor="tx-search">Search</label>
                    <div className="tx-search">
                        <Search size={16} aria-hidden="true" />
                        <input id="tx-search" type="search" placeholder="Description, category or account" value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })} />
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="tx-filter-type">Type</label>
                    <select id="tx-filter-type" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                        <option value="">All types</option>
                        <option value="EXPENSE">Expenses</option>
                        <option value="INCOME">Income</option>
                        <option value="REFUND">Refunds</option>
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="tx-filter-bank">Account</label>
                    <select id="tx-filter-bank" value={filters.bank} onChange={e => setFilters({ ...filters, bank: e.target.value })}>
                        <option value="">All accounts</option>
                        <option value="none">Unassigned</option>
                        {data.accounts.filter(a => a.currency === currency).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="tx-filter-source">Source</label>
                    <select id="tx-filter-source" value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })}>
                        <option value="">Manual and imported</option>
                        <option value="MANUAL">Manual</option>
                        <option value="IMPORTED">Imported</option>
                    </select>
                </div>
            </div>

            {notice && (
                <div className="tx-notice" role="status">
                    <span>{notice.message}</span>
                    {notice.undo && <button type="button" className="btn btn--ghost" disabled={busy} onClick={notice.undo}>Undo</button>}
                    <button type="button" className="btn btn--ghost" onClick={() => setNotice(null)}>Dismiss</button>
                </div>
            )}

            <section className="card tx-list" aria-labelledby="tx-list-title">
                <div className="card__header">
                    <h2 className="card__title" id="tx-list-title">Entries</h2>
                    {isCurrent && (
                        <p className="card__description" aria-live="polite">
                            {filtered ? `${shown.length} of ${all.length} entries match` : `${all.length} entries`} in {formatMonth(month)}
                        </p>
                    )}
                </div>

                {data.error && !isCurrent && <ErrorState message={data.error} onRetry={load} />}
                {!data.error && !isCurrent && <LoadingSkeleton lines={6} label="Loading transactions…" />}
                {isCurrent && data.error && <p className="form-error" role="alert">{data.error} Showing the entries loaded earlier.</p>}

                {isCurrent && !all.length && (
                    <EmptyState icon={Receipt} title={`No entries for ${formatMonth(month)} in ${currency}`}
                        message="Add a transaction, or import a CSV file from your bank."
                        action={<button type="button" className="btn btn--primary" onClick={() => openDialog('add')}>Add transaction</button>} />
                )}
                {isCurrent && all.length > 0 && !shown.length && (
                    <EmptyState icon={Search} title="No entries match these filters"
                        action={<button type="button" className="btn btn--secondary" onClick={() => setFilters(noFilters)}>Clear filters</button>} />
                )}
                {shown.length > 0 && <>
                    <TransactionTable rows={shown.slice(0, visible)} currency={currency} busy={busy}
                        onEdit={t => openDialog('edit', t)} onAssign={t => openDialog('assign', t)}
                        onExclude={t => { setFormError(''); setExcluding(t); }} />
                    {shown.length > visible && (
                        <div className="tx-more">
                            <button type="button" className="btn btn--secondary" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                                Show {Math.min(PAGE_SIZE, shown.length - visible)} more
                            </button>
                            <span className="card__description">Showing {visible} of {shown.length}</span>
                        </div>
                    )}
                </>}
                <p className="tx-footnote">
                    Search and filters apply to the selected month. Imported entries are corrected by importing a higher
                    source revision; excluded entries keep their source history and are not brought back by repeated imports.
                </p>
            </section>

            <Modal open={dialog?.kind === 'add' || dialog?.kind === 'edit'} busy={busy} onClose={() => setDialog(null)}
                title={dialog?.kind === 'edit' ? 'Edit transaction' : 'Add transaction'}
                description={dialog?.kind === 'edit' ? `#${dialog.transaction.id} · ${dialog.transaction.currency}` : `${formatMonth(month)} · ${currency}`}>
                <TransactionForm editing={dialog?.kind === 'edit' ? dialog.transaction : null} currency={currency} digits={digits}
                    step={amountStep(digits)} accounts={data.accounts} expenses={expenses} categories={categories}
                    busy={busy} error={formError} onSave={dialog?.kind === 'edit' ? saveEdit : saveNew} onCancel={() => setDialog(null)} />
            </Modal>

            <Modal open={dialog?.kind === 'assign'} busy={busy} onClose={() => setDialog(null)} title="Change bank account"
                description={dialog?.transaction ? `${dialog.transaction.description} · ${formatMoney(dialog.transaction.amount, dialog.transaction.currency)}` : ''}>
                {dialog?.transaction && <BankAssignForm transaction={dialog.transaction} accounts={data.accounts} busy={busy}
                    error={formError} onSave={saveAccount} onCancel={() => setDialog(null)} />}
            </Modal>

            <Modal open={dialog?.kind === 'export'} onClose={() => setDialog(null)} title="Download CSV report"
                description="Your active ledger entries, for reviewing or sharing. Not the import file format.">
                <ExportForm accounts={data.accounts} month={month} currency={currency} onDone={() => setDialog(null)} />
            </Modal>

            <ConfirmDialog open={Boolean(excluding)} busy={busy} title="Exclude this entry from your totals?"
                message={excluding ? `“${excluding.description}” (${formatMoney(excluding.amount, excluding.currency)}, ${excluding.date}) will no longer count in totals, budgets or forecasts. You can undo this straight away.${formError ? ` ${formError}` : ''}` : ''}
                confirmLabel="Exclude entry" onConfirm={exclude} onCancel={() => { setExcluding(null); setFormError(''); }} />
        </div>
    );
}
