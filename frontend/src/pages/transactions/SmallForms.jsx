import { useState } from 'react';
import api from '../../api/axios';
import { formatMonth } from '../../format';

// Assign or clear an entry's bank account. Amounts and source history do not change; linked refunds follow.
export function BankAssignForm({ transaction, accounts, busy, error, onSave, onCancel }) {
    const [bank, setBank] = useState(transaction.bankAccountId ? String(transaction.bankAccountId) : '');
    const choices = accounts.filter(a => a.currency === transaction.currency);
    return (
        <form onSubmit={(event) => { event.preventDefault(); onSave(bank ? Number(bank) : null); }}>
            <div className="field">
                <label htmlFor="assign-bank">Bank account</label>
                <select id="assign-bank" value={bank} onChange={e => setBank(e.target.value)} disabled={busy}>
                    <option value="">Unassigned</option>
                    {choices.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <p className="field__hint">Only {transaction.currency} accounts are listed.</p>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save account'}</button>
            </div>
        </form>
    );
}

// Download the CSV report (GET /api/transactions/export). Filters run on the server; the file holds only
// your active ledger entries. This is a report, not the batch-upload file format.
export function ExportForm({ accounts, month, currency, onDone }) {
    const [type, setType] = useState('');
    const [dates, setDates] = useState('selected');
    const [currencies, setCurrencies] = useState('selected');
    const [bank, setBank] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function download(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (type) params.set('type', type);
            if (dates === 'selected') params.set('month', month);
            if (currencies === 'selected') params.set('currency', currency);
            if (bank) params.set('bankAccountId', bank);
            const { data } = await api.get(`/api/transactions/export?${params}`, { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'finance-transactions-report.csv';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            onDone();
        } catch {
            setError('The report could not be downloaded. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={download}>
            <div className="form-grid">
                <div className="field">
                    <label htmlFor="export-type">Transaction types</label>
                    <select id="export-type" value={type} onChange={e => setType(e.target.value)} disabled={busy}>
                        <option value="">Expenses, refunds and income</option>
                        <option value="EXPENSE">Expenses only</option>
                        <option value="REFUND">Refunds only</option>
                        <option value="INCOME">Income only</option>
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="export-dates">Dates</label>
                    <select id="export-dates" value={dates} onChange={e => setDates(e.target.value)} disabled={busy}>
                        <option value="selected">{formatMonth(month)}</option>
                        <option value="all">All dates</option>
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="export-currency">Currencies</label>
                    <select id="export-currency" value={currencies} onChange={e => setCurrencies(e.target.value)} disabled={busy}>
                        <option value="selected">{currency} only</option>
                        <option value="all">All currencies (separate rows)</option>
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="export-bank">Bank account</label>
                    <select id="export-bank" value={bank} onChange={e => setBank(e.target.value)} disabled={busy}>
                        <option value="">All, including unassigned</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onDone} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Preparing report…' : 'Download CSV'}</button>
            </div>
        </form>
    );
}
