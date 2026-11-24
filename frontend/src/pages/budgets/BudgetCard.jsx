import { CircleCheck, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatMoney } from '../../format';
import { barSegments, budgetStatus, budgetTone, forecastView } from './budgetRules';

// One budget: actual spending (solid), the month-end estimate (striped) and the limit (marker),
// all drawn on one scale, with the exact figures in text beside them.
export default function BudgetCard({ budget, spent, forecast, currency, digits, forecastsAvailable, busy, onEdit, onDelete }) {
    const status = budgetStatus(budget, spent, digits);
    const estimate = forecastView(forecast);
    const projectedOver = estimate.state === 'ready' && !estimate.onTrack;
    const tone = budgetTone(status.percent, projectedOver);
    const bar = barSegments(budget.monthlyLimit, spent, estimate.state === 'ready' ? estimate.predicted : null);
    const money = (value) => formatMoney(value, currency);

    const barLabel = `${budget.category}: spent ${money(spent)} of ${money(budget.monthlyLimit)}`
        + (estimate.state === 'ready' ? `, estimated ${money(estimate.predicted)} by month end` : '');

    return (
        <article className={`card budget-card budget-card--${tone}`} aria-labelledby={`budget-${budget.id}`}>
            <div className="budget-card__head">
                <h2 className="budget-card__title" id={`budget-${budget.id}`}>{budget.category}</h2>
                <div className="budget-card__actions">
                    <button type="button" className="btn btn--ghost btn--icon" disabled={busy} onClick={() => onEdit(budget)}
                        aria-label={`Edit ${budget.category} limit`} title="Edit limit">
                        <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn--ghost btn--icon budget-card__delete" disabled={busy} onClick={() => onDelete(budget)}
                        aria-label={`Delete ${budget.category} budget`} title="Delete budget">
                        <Trash2 size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <p className="budget-card__figures">
                <span className="budget-card__spent num">{money(spent)}</span>
                <span className="budget-card__limit">of {money(budget.monthlyLimit)}</span>
            </p>

            <div className="budget-bar" role="img" aria-label={barLabel}>
                <span className="budget-bar__spent" style={{ width: `${bar.spent}%` }} />
                {bar.projected > 0 && <span className="budget-bar__projected" style={{ left: `${bar.spent}%`, width: `${bar.projected}%` }} />}
                <span className="budget-bar__limit" style={{ left: `${bar.limit}%` }} />
            </div>

            <p className={`budget-card__remaining${status.over ? ' budget-card__remaining--over' : ''}`}>
                {status.over
                    ? <><TriangleAlert size={14} aria-hidden="true" /> Over by {money(status.remaining.slice(1))} · {status.percent}% used</>
                    : <>{money(status.remaining)} left · {status.percent ?? 0}% used</>}
            </p>

            <div className="budget-card__forecast">
                {!forecastsAvailable && <span>No forecast for past or future months.</span>}
                {forecastsAvailable && estimate.state === 'loading' && <span>Calculating the month-end estimate…</span>}
                {forecastsAvailable && (estimate.state === 'unavailable' || estimate.state === 'none') && (
                    <span>Estimate unavailable right now. The figures above are unaffected.</span>
                )}
                {forecastsAvailable && estimate.state === 'ready' && <>
                    <span>
                        Estimated month end <strong className="num">{money(estimate.predicted)}</strong>
                        {estimate.confidence && <> · {estimate.confidence} confidence</>}
                    </span>
                    {estimate.onTrack
                        ? <Badge tone="success" icon={CircleCheck}>On track</Badge>
                        : <Badge tone="warning" icon={TriangleAlert}>Projected over by {money(estimate.overBy)}</Badge>}
                </>}
            </div>
        </article>
    );
}
