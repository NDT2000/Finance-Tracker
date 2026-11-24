import Badge from '../../components/ui/Badge';
import { outcomeView, parseCandidates, parseFields } from './importRules';

// One page of CSV rows with their outcomes. Values are shown exactly as uploaded, since rejected rows
// may not be valid dates or amounts. Rows waiting for review offer the backend's exact-match candidates.
export default function ImportRowsTable({ rows, busy, onReview }) {
    return (
        <div className="ledger">
            <table className="ledger__table">
                <caption className="sr-only">Rows in this import</caption>
                <thead>
                    <tr>
                        <th scope="col">Row</th>
                        <th scope="col">Date</th>
                        <th scope="col">Description</th>
                        <th scope="col" className="ledger__amount">Amount</th>
                        <th scope="col">Outcome</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const f = parseFields(row.raw_data);
                        const outcome = outcomeView(row.status);
                        const review = row.status === 'NEEDS_REVIEW';
                        return (
                            <tr key={row.row_number} className={review ? 'imports-row--review' : undefined}>
                                <td data-label="Row" className="ledger__muted num">{row.row_number}</td>
                                <td data-label="Date" className="ledger__date">{f.date || '—'}</td>
                                <td data-label="Description">
                                    <span className="ledger__description">{f.description || '—'}</span>
                                    <span className="ledger__sub">
                                        {f.type && <span>{f.type}</span>}
                                        {f.category && <span>{f.category}</span>}
                                        {f.source_transaction_id && <span>ID {f.source_transaction_id}</span>}
                                        {f.revision && <span>Revision {f.revision}</span>}
                                        {f.refund_of && <span>Refund of {f.refund_of}</span>}
                                    </span>
                                </td>
                                <td data-label="Amount" className="ledger__amount num">
                                    {f.amount || '—'} {f.currency}
                                </td>
                                <td data-label="Outcome">
                                    <div className="imports-outcome">
                                        <Badge tone={outcome.tone}>{outcome.label}</Badge>
                                        {row.message && <span className="imports-outcome__message">{row.message}</span>}
                                        {row.transaction_id && <span className="ledger__muted">Transaction #{row.transaction_id}</span>}
                                        {review && <ReviewActions row={row} busy={busy} onReview={onReview} />}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ReviewActions({ row, busy, onReview }) {
    const label = `row ${row.row_number}`;
    return (
        <div className="imports-review" role="group" aria-label={`Review ${label}`}>
            {parseCandidates(row.candidates).map(id => (
                <button key={id} type="button" className="btn btn--secondary" disabled={busy}
                    onClick={() => onReview(row, { action: 'LINK', transactionId: id }, `Linked ${label} to transaction #${id}.`)}>
                    Same as #{id}
                </button>
            ))}
            <button type="button" className="btn btn--secondary" disabled={busy}
                onClick={() => onReview(row, { action: 'KEEP_BOTH' }, `Kept ${label} as a new transaction.`)}>
                Keep as new
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy}
                onClick={() => onReview(row, { action: 'IGNORE' }, `Ignored ${label}.`)}>
                Ignore row
            </button>
        </div>
    );
}
