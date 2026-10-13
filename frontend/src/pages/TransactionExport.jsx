import { useState } from 'react';
import api from '../api/axios';

export default function TransactionExport({ accounts, month, currency }) {
    const [type, setType] = useState('');
    const [dates, setDates] = useState('all');
    const [money, setMoney] = useState('all');
    const [bank, setBank] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function download(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const params = new URLSearchParams();
            if (type) params.set('type', type);
            if (dates === 'selected') params.set('month', month);
            if (money === 'selected') params.set('currency', currency);
            if (bank) params.set('bankAccountId', bank);
            const { data } = await api.get(`/api/transactions/export?${params}`, { responseType: 'blob' });
            const url = URL.createObjectURL(data); const link = document.createElement('a');
            link.href = url; link.download = 'finance-transactions-report.csv'; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setError('The report could not be downloaded. Please refresh and try again.'); }
        finally { setBusy(false); }
    }
    return <section className="pipeline-card" aria-labelledby="export-title"><h2 id="export-title">Download transactions</h2>
        <p>Export your expenses, refunds and income, including their bank accounts, as a CSV report.</p>
        <form className="pipeline-form" onSubmit={download}>
            <div className="pipeline-export-field"><label htmlFor="export-type">Transaction types</label><select id="export-type" value={type} disabled={busy} onChange={e => setType(e.target.value)}>
                <option value="">Expenses, refunds and income</option><option value="EXPENSE">Expenses only</option><option value="REFUND">Refunds only</option><option value="INCOME">Income only</option>
            </select></div>
            <div className="pipeline-export-field"><label htmlFor="export-dates">Report dates</label><select id="export-dates" value={dates} disabled={busy} onChange={e => setDates(e.target.value)}>
                <option value="all">All dates</option><option value="selected">Selected month ({month})</option>
            </select></div>
            <div className="pipeline-export-field"><label htmlFor="export-currency">Report currencies</label><select id="export-currency" value={money} disabled={busy} onChange={e => setMoney(e.target.value)}>
                <option value="all">All currencies (separate rows)</option><option value="selected">Selected currency ({currency})</option>
            </select></div>
            <div className="pipeline-export-field"><label htmlFor="export-bank">Report bank account</label><select id="export-bank" value={bank} disabled={busy} onChange={e => setBank(e.target.value)}>
                <option value="">All accounts, including unassigned</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select></div>
            <button disabled={busy} type="submit">{busy ? 'Preparing report…' : 'Download CSV report'}</button>
        </form>
        {error && <p role="alert" className="pipeline-error">{error}</p>}
        <p className="pipeline-help">Only your active ledger entries are included. Refund amounts stay positive and are identified by type. This report is for reviewing or sharing your data; it is not the batch-upload file format.</p>
    </section>;
}
