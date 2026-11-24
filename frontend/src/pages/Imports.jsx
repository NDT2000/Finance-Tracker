import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, History, TriangleAlert, Upload } from 'lucide-react';
import api from '../api/axios';
import Badge from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import UploadCard from './imports/UploadCard';
import ImportHistoryTable, { dateTime } from './imports/ImportHistoryTable';
import ImportStatusCard from './imports/ImportStatusCard';
import ImportRowsTable from './imports/ImportRowsTable';
import useImports from './imports/useImports';
import { HISTORY_PAGE, ROWS_PAGE, rejectionReportCsv } from './imports/importRules';
import './imports/Imports.css';

// CSV import workflow (docs/design-system.md §16). The selected import lives in the URL (?batch=<id>)
// so "View import" links from Transactions open it directly.
export default function Imports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const batchId = searchParams.get('batch') ?? '';
    const [historyOffset, setHistoryOffset] = useState(0);
    const [rowOffset, setRowOffset] = useState(0);
    const [rejectedOnly, setRejectedOnly] = useState(false);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [notice, setNotice] = useState('');
    const [actionError, setActionError] = useState('');
    const { history, batch, rows, freshness, error, batchError, reload } = useImports({ batchId, historyOffset, rowOffset, rejectedOnly });
    // Ignore a batch left over from the previous selection until the new one has loaded
    const selected = batch && batch.id === batchId ? batch : null;

    function select(id) {
        setRowOffset(0);
        setRejectedOnly(false);
        setActionError('');
        setSearchParams(id ? { batch: id } : {});
    }

    async function upload(file, accountRef) {
        setBusy(true);
        setUploading(true);
        setProgress(null);
        setNotice('');
        setActionError('');
        try {
            const body = new FormData();
            body.append('file', file);
            body.append('accountRef', accountRef);
            const { data } = await api.post('/api/imports', body, {
                onUploadProgress: e => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : null),
            });
            setNotice(data.repeated
                ? `${file.name} was already uploaded for ${accountRef}. Showing that import.`
                : `${file.name} uploaded. Processing is queued.`);
            setHistoryOffset(0);
            select(data.id);
            // Selecting the import that is already open doesn't change the URL, so load it explicitly
            if (data.id === batchId) await reload();
            return true;
        } catch (err) {
            setActionError(err.response?.data?.message || 'The upload failed. Uploading the same file again is safe.');
            return false;
        } finally {
            setBusy(false);
            setUploading(false);
            setProgress(null);
        }
    }

    async function act(request, message) {
        setBusy(true);
        setNotice('');
        setActionError('');
        try {
            await request();
            setNotice(message);
            await reload();
        } catch (err) {
            setActionError(err.response?.data?.message || 'That action failed. Refresh and try again.');
        } finally {
            setBusy(false);
        }
    }

    const retry = () => act(() => api.post(`/api/imports/${batchId}/retry`), 'Import queued for processing.');
    const review = (row, decision, message) => act(() => api.post(`/api/imports/${batchId}/rows/${row.row_number}/review`, decision), message);

    function save(blob, name) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    const baseName = () => selected.filename.replace(/\.csv$/i, '');

    async function downloadSource() {
        setActionError('');
        try {
            const { data } = await api.get(`/api/imports/${batchId}/source`, { responseType: 'blob' });
            save(data, selected.filename);
        } catch {
            setActionError('The download failed. Please try again.');
        }
    }

    async function downloadReport() {
        setActionError('');
        try {
            const all = [];
            for (let offset = 0; ; offset += ROWS_PAGE) {
                const { data } = await api.get(`/api/imports/${batchId}/rows?offset=${offset}&rejectedOnly=true`);
                all.push(...data);
                if (data.length < ROWS_PAGE) break;
            }
            save(new Blob([rejectionReportCsv(all)], { type: 'text/csv;charset=utf-8' }), `${baseName()}-rejected-rows.csv`);
        } catch {
            setActionError('The download failed. Please try again.');
        }
    }

    function filterRows(next) {
        setRejectedOnly(next);
        setRowOffset(0);
    }

    return (
        <div className="page">
            <div className="page__head">
                <div>
                    <h1 className="page__title">Import Transactions</h1>
                    <p className="page__subtitle">CSV files from your bank</p>
                </div>
            </div>

            {freshness && <Freshness imports={freshness} />}

            {notice && (
                <div className="imports-notice" role="status">
                    <span>{notice}</span>
                    <button type="button" className="btn btn--ghost" onClick={() => setNotice('')}>Dismiss</button>
                </div>
            )}
            {actionError && <p className="form-error" role="alert">{actionError}</p>}

            <UploadCard busy={busy} uploading={uploading} progress={progress} onUpload={upload} />

            {batchId && (
                batchError ? (
                    <div className="card"><ErrorState title="Import unavailable" message={batchError} onRetry={reload} /></div>
                ) : !selected ? (
                    <div className="card"><LoadingSkeleton lines={4} label="Loading import…" /></div>
                ) : <>
                    <ImportStatusCard batch={selected} busy={busy} onClose={() => select('')} onRetry={retry}
                        onDownloadSource={downloadSource} onDownloadReport={downloadReport} />
                    {selected.total_rows > 0 && (
                        <section className="card" aria-labelledby="rows-title">
                            <div className="card__header">
                                <h2 className="card__title" id="rows-title">Rows</h2>
                                <div className="imports-filter" role="group" aria-label="Show rows">
                                    <button type="button" className="btn btn--ghost" aria-pressed={!rejectedOnly} onClick={() => filterRows(false)}>All rows</button>
                                    <button type="button" className="btn btn--ghost" aria-pressed={rejectedOnly} onClick={() => filterRows(true)}>Rejected</button>
                                </div>
                            </div>
                            {rows.length
                                ? <ImportRowsTable rows={rows} busy={busy} onReview={review} />
                                : <EmptyState title={rejectedOnly ? 'No rejected rows' : 'No row results yet'} />}
                            <Pager offset={rowOffset} size={ROWS_PAGE} count={rows.length} noun="rows" onChange={setRowOffset} />
                        </section>
                    )}
                </>
            )}

            <section className="card" aria-labelledby="history-title">
                <div className="card__header">
                    <h2 className="card__title imports-title" id="history-title"><History size={18} aria-hidden="true" /> Import history</h2>
                </div>
                {error && !history && <ErrorState message={error} onRetry={reload} />}
                {!error && !history && <LoadingSkeleton lines={4} label="Loading import history…" />}
                {history && <>
                    {error && <p className="form-error" role="alert">{error} Showing the list loaded earlier.</p>}
                    {history.length
                        ? <ImportHistoryTable imports={history} selectedId={batchId} onSelect={select} />
                        : <EmptyState icon={Upload} title={historyOffset ? 'No more imports' : 'No imports yet'}
                            message={historyOffset ? undefined : 'Upload a CSV file to add transactions.'} />}
                    <Pager offset={historyOffset} size={HISTORY_PAGE} count={history.length} noun="imports" onChange={setHistoryOffset} />
                </>}
            </section>
        </div>
    );
}

// Import freshness across all uploads, from the backend summary.
function Freshness({ imports }) {
    const pending = Number(imports.pending_jobs);
    const review = Number(imports.review_jobs);
    const failed = Number(imports.failed_jobs);
    return (
        <div className="card imports-freshness" aria-label="Import freshness">
            <span className="imports-freshness__latest">
                {imports.latest_import_at ? <>Latest import applied <strong>{dateTime(imports.latest_import_at)}</strong></> : 'No CSV imports applied yet'}
            </span>
            <span className="imports-freshness__badges">
                {!pending && !review && !failed && <Badge tone="success">Nothing waiting</Badge>}
                {pending > 0 && <Badge tone="pending" icon={Clock}>{pending} processing</Badge>}
                {review > 0 && <Badge tone="warning">{review} awaiting review</Badge>}
                {failed > 0 && <Badge tone="danger" icon={TriangleAlert}>{failed} failed</Badge>}
            </span>
        </div>
    );
}

// Previous / next for offset-paged lists. The backend returns a full page while more may follow.
function Pager({ offset, size, count, noun, onChange }) {
    if (!offset && count < size) return null;
    return (
        <div className="imports-pager">
            <button type="button" className="btn btn--secondary" disabled={!offset} onClick={() => onChange(Math.max(0, offset - size))}>
                Previous {noun}
            </button>
            <span className="ledger__muted">{count ? `${offset + 1}–${offset + count}` : ''}</span>
            <button type="button" className="btn btn--secondary" disabled={count < size} onClick={() => onChange(offset + size)}>
                Next {noun}
            </button>
        </div>
    );
}
