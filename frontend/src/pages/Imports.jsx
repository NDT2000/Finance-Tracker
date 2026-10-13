import AppHeader from '../components/AppHeader';
import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import './Pipeline.css';

const active = status => ['QUEUED', 'PROCESSING'].includes(status);
export default function Imports() {
    const [history, setHistory] = useState([]);
    const [offset, setOffset] = useState(0);
    const [selected, setSelected] = useState(null);
    const [batch, setBatch] = useState(null);
    const [rows, setRows] = useState([]);
    const [rowOffset, setRowOffset] = useState(0);
    const [file, setFile] = useState(null);
    const [account, setAccount] = useState('default');
    const [progress, setProgress] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const sequence = useRef(0); const query = useRef({});
    query.current = { id: selected, page: offset, rowPage: rowOffset };
    async function refresh(id = selected, page = offset, rowPage = rowOffset) {
        const request = ++sequence.current;
        const { data } = await api.get(`/api/imports?offset=${page}`);
        if (request !== sequence.current || page !== query.current.page) return;
        setHistory(data);
        if (id) {
            const [detail, results] = await Promise.all([api.get(`/api/imports/${id}`), api.get(`/api/imports/${id}/rows?offset=${rowPage}`)]);
            if (request === sequence.current && id === query.current.id && rowPage === query.current.rowPage) { setBatch(detail.data); setRows(results.data); }
        }
    }
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try { if (!cancelled) await refresh(); }
            catch { if (!cancelled) setError('Import history could not be loaded. Retry or reload the page.'); }
        }
        load(); const timer = setInterval(load, 2000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [selected, offset, rowOffset]);
    async function upload(event) {
        event.preventDefault(); setError(''); setNotice('');
        if (!file) { setError('Choose a CSV file.'); return; }
        if (file.size > 2 * 1024 * 1024) { setError('CSV files must be at most 2 MiB.'); return; }
        setBusy(true); setProgress(0);
        try {
            const body = new FormData(); body.append('file', file); body.append('accountRef', account);
            const { data } = await api.post('/api/imports', body, { onUploadProgress: e => setProgress(e.total ? Math.round(e.loaded / e.total * 100) : null) });
            setSelected(data.id); setRowOffset(0); setOffset(0); setBatch(data); setRows([]);
            setNotice(data.repeated ? 'This exact file already exists in this account scope. Showing its existing import.' : 'File uploaded. Processing is queued.');
            await refresh(data.id, 0, 0);
        } catch (err) { setError(err.response?.data?.message || 'Upload failed. Repeating the same file is safe.'); }
        finally { setBusy(false); setProgress(null); }
    }
    async function action(path, body) {
        setBusy(true); setError('');
        try { await api.post(path, body); await refresh(); }
        catch (err) { setError(err.response?.data?.message || 'The action failed. Refresh before retrying.'); }
        finally { setBusy(false); }
    }
    async function download(rejected = false) {
        setError('');
        try {
            let blob;
            if (rejected) {
                const all = []; let page = 0;
                for (;;) {
                    const { data } = await api.get(`/api/imports/${selected}/rows?offset=${page}&rejectedOnly=true`);
                    all.push(...data); if (data.length < 100) break; page += 100;
                }
                blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
            } else blob = (await api.get(`/api/imports/${selected}/source`, { responseType: 'blob' })).data;
            const url = URL.createObjectURL(blob); const link = document.createElement('a');
            link.href = url; link.download = rejected ? `${selected}-rejections.json` : `${selected}-source.csv`;
            link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setError('Download failed. Please try again.'); }
    }
    return <div className="pipeline-page">
        <AppHeader />
        <main><h1>Batch imports</h1><p>Upload CSVs, review their results, and keep one trustworthy transaction ledger.</p>
            {error && <p role="alert" className="pipeline-error">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            <section className="pipeline-card"><h2>Upload expenses</h2>
                <form onSubmit={upload} className="pipeline-form">
                    <label>Source account reference<input value={account} onChange={e => setAccount(e.target.value)} pattern="[A-Za-z0-9_.-]{1,80}" required maxLength={80} disabled={busy}/></label>
                    <label>CSV file<input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files[0] || null)} disabled={busy}/></label>
                    <button disabled={busy} type="submit">{busy ? 'Working…' : 'Upload CSV'}</button>
                </form>
                <p className="pipeline-help">UTF-8, up to 2 MiB and 5,000 rows. Required columns: date, category, description, amount, currency.
                    Include source_transaction_id for automatic promotion; revision supports corrections. type defaults to EXPENSE; refunds use REFUND and refund_of.
                    Keep the same account reference across exports. Rows without source IDs require review.</p>
                {progress !== null && <p role="status">Uploading file: {progress}% (processing starts after upload)</p>}
            </section>
            <section className="pipeline-card"><h2>Import history</h2>
                {!history.length ? <p>No imports on this page.</p> : <div className="pipeline-table"><table><thead><tr><th>File / account</th><th>Status</th><th>Rows</th><th>Uploaded</th><th>Results</th></tr></thead>
                    <tbody>{history.map(item => <tr key={item.id}><td>{item.filename}<small>{item.account_ref}</small></td><td>{item.status}</td><td>{item.total_rows}</td><td>{new Date(item.created_at).toLocaleString()}</td>
                        <td><button disabled={busy} onClick={() => { setSelected(item.id); setRowOffset(0); setBatch(null); setRows([]); }}>View results</button></td></tr>)}</tbody></table></div>}
                <div className="pipeline-actions"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous imports</button><button disabled={history.length < 50} onClick={() => setOffset(offset + 50)}>Next imports</button></div>
            </section>
            {selected && <section className="pipeline-card"><h2>Import results</h2>
                {!batch ? <p>Loading results…</p> : <>
                    <p><strong>{batch.status}</strong> · {batch.stage} · {batch.total_rows} rows · attempt {batch.attempts}/3</p>
                    <p className="pipeline-help">SHA-256: {batch.file_hash}</p>
                    {active(batch.status) && <p role="status">Processing is atomic. Row results and ledger changes appear together when the job commits.</p>}
                    {batch.error_code && <p role="alert" className="pipeline-error">{batch.error_code}</p>}
                    <p>{(batch.counts || []).map(c => `${c.status}: ${c.count}`).join(' · ')}</p>
                    <div className="pipeline-actions"><button onClick={() => download()}>Download original CSV</button>
                        <button disabled={active(batch.status)} onClick={() => download(true)}>Download rejected rows (JSON)</button>
                        <button disabled={busy || active(batch.status)} onClick={() => action(`/api/imports/${selected}/retry`)}>Re-evaluate / retry</button></div>
                    <div className="pipeline-table"><table><thead><tr><th>CSV row</th><th>Source values</th><th>Outcome</th><th>Review</th></tr></thead><tbody>
                        {rows.map(row => <tr key={row.row_number}><td>{row.row_number}</td><td><code>{row.raw_data.slice(0, 300)}{row.raw_data.length > 300 ? '…' : ''}</code></td><td>{row.status}<small>{row.message}</small>{row.transaction_id && <small>Ledger entry #{row.transaction_id}</small>}</td>
                            <td>{row.status === 'NEEDS_REVIEW' && <div className="pipeline-actions">
                                {(JSON.parse(row.candidates || '[]')).map(id => <button key={id} disabled={busy} onClick={() => action(`/api/imports/${selected}/rows/${row.row_number}/review`, { action: 'LINK', transactionId: id })}>Link entry #{id}</button>)}
                                <button disabled={busy} onClick={() => action(`/api/imports/${selected}/rows/${row.row_number}/review`, { action: 'KEEP_BOTH' })}>Keep as a distinct event</button>
                                <button disabled={busy} onClick={() => action(`/api/imports/${selected}/rows/${row.row_number}/review`, { action: 'IGNORE' })}>Ignore row</button>
                            </div>}</td></tr>)}
                    </tbody></table></div>
                    <div className="pipeline-actions"><button disabled={!rowOffset} onClick={() => setRowOffset(Math.max(0, rowOffset - 100))}>Previous rows</button><button disabled={rows.length < 100} onClick={() => setRowOffset(rowOffset + 100)}>Next rows</button></div>
                </>}
            </section>}
        </main>
    </div>;
}
