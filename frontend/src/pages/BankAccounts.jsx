import { useEffect, useState } from 'react';
import api from '../api/axios';

const accountTypes = { CHECKING: 'Checking', SAVINGS: 'Savings', CREDIT: 'Credit', CASH: 'Cash' };

export default function BankAccounts() {
    const [accounts, setAccounts] = useState([]);
    const [currencies, setCurrencies] = useState([{ code: 'USD' }]);
    const [form, setForm] = useState({ name: '', type: 'CHECKING', currency: 'USD' });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        let active = true;
        api.get('/api/accounts').then(({ data }) => { if (active) setAccounts(data); })
            .catch(() => { if (active) setLoadError('Your bank accounts could not be loaded.'); })
            .finally(() => { if (active) setLoading(false); });
        api.get('/api/analytics/currencies').then(({ data }) => { if (active) setCurrencies(data); }).catch(() => {});
        return () => { active = false; };
    }, []);

    async function reload() {
        setLoading(true); setLoadError('');
        try { const { data } = await api.get('/api/accounts'); setAccounts(data); }
        catch { setLoadError('Your bank accounts could not be loaded. Please try again.'); }
        finally { setLoading(false); }
    }

    async function add(event) {
        event.preventDefault();
        if (busy) return;
        setError(''); setNotice('');
        if (!form.name.trim()) { setError('Enter a bank or account name.'); return; }
        setBusy(true);
        try {
            const { data } = await api.post('/api/accounts', { ...form, name: form.name.trim() });
            setAccounts(items => [...items, data]); setForm({ ...form, name: '' });
            setNotice('Bank account added.');
        } catch (err) { setError(err.response?.data?.message || 'Your bank account could not be added. Please try again.'); }
        finally { setBusy(false); }
    }

    async function remove() {
        if (busy || !deleting) return;
        setBusy(true); setError(''); setNotice('');
        try {
            await api.delete(`/api/accounts/${deleting.id}`);
            setAccounts(items => items.filter(item => item.id !== deleting.id)); setDeleting(null);
            setNotice('Bank account deleted. Your transaction history is unchanged.');
        } catch (err) { setError(err.response?.data?.message || 'Your bank account could not be deleted. Please try again.'); }
        finally { setBusy(false); }
    }

    return <section className="profile-card" id="profile-banks-panel" aria-labelledby="banks-title">
        <h2 id="banks-title">Bank accounts</h2>
        <p>Add multiple bank or account entries to your profile.</p>
        <p className="profile-help">These are saved account labels. Bank login details and account numbers are not required. Deleting an entry keeps your transactions and imports.</p>
        {error && <p role="alert" className="profile-error">{error}</p>}
        {notice && <p role="status" className="profile-success">{notice}</p>}
        {loading ? <p role="status">Loading bank accounts…</p> : loadError ? <div><p role="alert" className="profile-error">{loadError}</p><button type="button" onClick={reload}>Retry loading accounts</button></div> : <>
            {!accounts.length ? <p>No bank accounts added yet.</p> : <ul className="profile-bank-list">{accounts.map(account => <li key={account.id}>
                <div><strong>{account.name}</strong><span>{accountTypes[account.type] || account.type} · {account.currency}</span></div>
                <button type="button" disabled={busy} aria-label={`Delete ${account.name}`} onClick={() => { setDeleting(account); setError(''); setNotice(''); }}>Delete</button>
            </li>)}</ul>}
            {deleting && <div className="profile-delete-confirm" role="group" aria-label="Confirm bank deletion">
                <p>Delete “{deleting.name}” from your profile?</p>
                <button type="button" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Confirm delete'}</button>
                <button type="button" disabled={busy} onClick={() => setDeleting(null)}>Cancel deletion</button>
            </div>}
            <form onSubmit={add} aria-labelledby="add-bank-title">
                <h3 id="add-bank-title">Add bank account</h3>
                <label htmlFor="bank-name">Bank or account name</label>
                <input id="bank-name" value={form.name} required maxLength={100} disabled={busy} placeholder="Example: My bank — savings"
                    onChange={event => setForm({ ...form, name: event.target.value })}/>
                <label htmlFor="bank-type">Account type</label>
                <select id="bank-type" value={form.type} disabled={busy} onChange={event => setForm({ ...form, type: event.target.value })}>
                    {Object.entries(accountTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label htmlFor="bank-currency">Account currency</label>
                <select id="bank-currency" value={form.currency} disabled={busy} onChange={event => setForm({ ...form, currency: event.target.value })}>
                    {currencies.map(item => <option key={item.code} value={item.code}>{item.code}</option>)}
                </select>
                <button type="submit" className="profile-primary" disabled={busy}>{busy ? 'Working…' : 'Add bank account'}</button>
            </form>
        </>}
    </section>;
}
