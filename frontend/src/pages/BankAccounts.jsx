import { useCallback, useEffect, useState } from 'react';
import { Landmark, Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import AccountForm from './accounts/AccountForm';
import { accountTypeLabel, sortAccounts } from './accounts/accountRules';
import './accounts/BankAccounts.css';

// Named bank-account entries (docs/design-system.md §4). They are labels for transactions, never
// live bank connections, so no balance is shown.
export default function BankAccounts() {
    const [accounts, setAccounts] = useState(null);
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const [loadError, setLoadError] = useState('');
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');

    const load = useCallback(async () => {
        setLoadError('');
        try {
            const { data } = await api.get('/api/accounts');
            setAccounts(data);
        } catch {
            setLoadError('Your bank accounts could not be loaded.');
        }
    }, []);

    useEffect(() => {
        load();
        api.get('/api/analytics/currencies').then(({ data }) => setCurrencies(data)).catch(() => {});
    }, [load]);

    function openAdd() {
        setFormError('');
        setAdding(true);
    }

    async function change(request, message) {
        setBusy(true);
        setFormError('');
        try {
            await request();
            setAdding(false);
            setDeleting(null);
            setNotice(message);
            await load();
        } catch (err) {
            setFormError(err.response?.data?.message || 'That change could not be saved. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const add = body => change(() => api.post('/api/accounts', body), `Added ${body.name}.`);
    const remove = () => change(() => api.delete(`/api/accounts/${deleting.id}`), `Deleted ${deleting.name}. Its transactions are unchanged.`);
    const addButton = (
        <button type="button" className="btn btn--primary" onClick={openAdd}>
            <Plus size={16} aria-hidden="true" /> Add account
        </button>
    );

    return (
        <div className="page">
            <div className="page__head">
                <div>
                    <h1 className="page__title">Bank Accounts</h1>
                    <p className="page__subtitle">Account labels for your transactions</p>
                </div>
                <div className="page__actions">{addButton}</div>
            </div>

            {notice && (
                <div className="accounts-notice" role="status">
                    <span>{notice}</span>
                    <button type="button" className="btn btn--ghost" onClick={() => setNotice('')}>Dismiss</button>
                </div>
            )}

            {loadError && !accounts && <div className="card"><ErrorState message={loadError} onRetry={load} /></div>}
            {!loadError && !accounts && <div className="card"><LoadingSkeleton lines={3} label="Loading bank accounts…" /></div>}

            {accounts && (accounts.length ? (
                <ul className="accounts-grid">
                    {sortAccounts(accounts).map(account => (
                        <li key={account.id} className="card account-card">
                            <span className="account-card__icon"><Landmark size={20} aria-hidden="true" /></span>
                            <div className="account-card__body">
                                <h2 className="account-card__name">{account.name}</h2>
                                <div className="account-card__meta">
                                    <Badge tone="info">{accountTypeLabel(account.type)}</Badge>
                                    <span>{account.currency}</span>
                                </div>
                            </div>
                            <button type="button" className="btn btn--ghost btn--icon account-card__delete" disabled={busy}
                                aria-label={`Delete ${account.name}`} onClick={() => { setFormError(''); setDeleting(account); }}>
                                <Trash2 size={18} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="card">
                    <EmptyState icon={Landmark} title="No bank accounts yet"
                        message="Add an account to assign transactions to it." action={addButton} />
                </div>
            ))}

            <Modal open={adding} busy={busy} onClose={() => setAdding(false)} title="Add account">
                {adding && <AccountForm currencies={currencies} busy={busy} error={formError} onSave={add} onCancel={() => setAdding(false)} />}
            </Modal>

            <ConfirmDialog open={Boolean(deleting)} busy={busy} title={deleting ? `Delete ${deleting.name}?` : ''}
                message={deleting ? `The account label will be removed. Transactions assigned to it keep their history.${formError ? ` ${formError}` : ''}` : ''}
                confirmLabel="Delete account" onConfirm={remove} onCancel={() => setDeleting(null)} />
        </div>
    );
}
