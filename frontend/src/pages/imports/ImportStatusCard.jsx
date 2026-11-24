import { Download, FileWarning, LoaderCircle, RotateCcw, X } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDateTime } from '../../format';
import { isActive, outcomeCounts, resultSummary, retryLabel, statusView } from './importRules';

const STAGES = {
    UPLOADED: 'Uploaded',
    VALIDATING_AND_PROMOTING: 'Validating and adding rows',
    COMMITTED: 'Committed',
    FAILED: 'Stopped',
};

const duration = ms => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

// The selected import: status, outcome counts from the backend, downloads and processing details.
export default function ImportStatusCard({ batch, busy, onClose, onRetry, onDownloadSource, onDownloadReport }) {
    const status = statusView(batch.status);
    const active = isActive(batch.status);
    const counts = outcomeCounts(batch.counts);
    const rejected = counts.find(c => c.status === 'REJECTED')?.count ?? 0;
    const summary = resultSummary(batch);

    return (
        <section className="card imports-status" aria-labelledby="import-title">
            <div className="card__header">
                <div className="imports-status__heading">
                    <h2 className="card__title imports-filename" id="import-title">{batch.filename}</h2>
                    <p className="card__description">{batch.account_ref} · Uploaded {formatDateTime(batch.created_at)}</p>
                </div>
                <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close import">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <div className="imports-status__state" role="status">
                <Badge tone={status.tone} icon={active ? LoaderCircle : undefined}>{status.label}</Badge>
                {batch.total_rows > 0 && <span className="ledger__muted">{batch.total_rows} {batch.total_rows === 1 ? 'row' : 'rows'}</span>}
                {summary.map(line => <span key={line} className="imports-status__line">{line}</span>)}
            </div>

            {counts.length > 0 && (
                <dl className="imports-counts">
                    {counts.map(c => (
                        <div key={c.status} className={`imports-counts__item imports-counts__item--${c.tone}`}>
                            <dt>{c.label}</dt>
                            <dd className="num">{c.count}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <div className="imports-actions">
                <button type="button" className="btn btn--secondary" onClick={onDownloadSource}>
                    <Download size={16} aria-hidden="true" /> Original CSV
                </button>
                {rejected > 0 && !active && (
                    <button type="button" className="btn btn--secondary" onClick={onDownloadReport}>
                        <FileWarning size={16} aria-hidden="true" /> Rejected rows (CSV)
                    </button>
                )}
                {!active && batch.status !== 'COMPLETED' && (
                    <button type="button" className="btn btn--secondary" disabled={busy} onClick={onRetry}>
                        <RotateCcw size={16} aria-hidden="true" /> {retryLabel(batch.status)}
                    </button>
                )}
            </div>

            <details className="imports-details">
                <summary>Processing details</summary>
                <dl className="imports-details__list">
                    <dt>Stage</dt><dd>{STAGES[batch.stage] ?? batch.stage}</dd>
                    <dt>Attempts</dt><dd>{batch.attempts} of 3</dd>
                    <dt>Started</dt><dd>{formatDateTime(batch.started_at)}</dd>
                    <dt>Finished</dt><dd>{formatDateTime(batch.finished_at)}</dd>
                    <dt>Duration</dt><dd>{duration(batch.duration_ms)}</dd>
                    {batch.error_code && <><dt>Error code</dt><dd><code>{batch.error_code}</code></dd></>}
                    <dt>Import ID</dt><dd><code>{batch.id}</code></dd>
                    <dt>File SHA-256</dt><dd><code className="imports-hash">{batch.file_hash}</code></dd>
                </dl>
            </details>
        </section>
    );
}
