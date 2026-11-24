import { Link } from 'react-router-dom';
import { ArrowRight, ChartLine, Clock, TriangleAlert, Upload } from 'lucide-react';
import Badge from '../../components/ui/Badge';

// Import freshness: what the ledger includes and what is still waiting. Counts come only from the
// backend summary; nothing is shown as imported until processing has committed it.
export function ImportsCard({ imports }) {
    const latest = imports.latest_import_at ? new Date(imports.latest_import_at) : null;
    const pending = Number(imports.pending_jobs);
    const review = Number(imports.review_jobs);
    const failed = Number(imports.failed_jobs);
    const allClear = !pending && !review && !failed;

    return (
        <section className="card overview__side-card" aria-labelledby="imports-title">
            <h2 className="card__title" id="imports-title">
                <Upload size={18} aria-hidden="true" /> Imports
            </h2>
            <p className="card__description">
                {latest
                    ? <>Latest import applied {latest.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</>
                    : 'No CSV imports applied yet'}
            </p>
            <div className="overview__badges">
                {allClear && <Badge tone="success">Nothing waiting</Badge>}
                {pending > 0 && <Badge tone="pending" icon={Clock}>{pending} processing</Badge>}
                {review > 0 && <Badge tone="warning">{review} awaiting review</Badge>}
                {failed > 0 && <Badge tone="danger" icon={TriangleAlert}>{failed} failed</Badge>}
            </div>
            {(review > 0 || pending > 0) && (
                <p className="overview__footnote">Rows still processing or awaiting review are not in these totals yet.</p>
            )}
            {failed > 0 && (
                <p className="overview__footnote">A failed import added nothing to your totals. Open imports to see what went wrong and retry.</p>
            )}
            <div className="overview__side-footer">
                <Link to="/imports" className="btn btn--ghost overview__side-link">
                    Go to imports <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}

// Entry point to scenario planning, kept clearly separate from actual figures.
export function PlanningCard() {
    return (
        <section className="card overview__side-card" aria-labelledby="planning-title">
            <h2 className="card__title" id="planning-title">
                <ChartLine size={18} aria-hidden="true" /> Plan ahead
            </h2>
            <p className="card__description">
                Try what-if scenarios for income, spending, investments and loans. Plans never change your actual transactions.
            </p>
            <div className="overview__side-footer">
                <Link to="/planning" className="btn btn--ghost overview__side-link">
                    Open financial planning <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
