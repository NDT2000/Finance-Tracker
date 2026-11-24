import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, Plus, Target, TriangleAlert } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../format';
import { budgetStatus, budgetTone, forecastView, spentFor } from '../budgets/budgetRules';

// Compact budget summary for the overview. The Budgets page shows the full detail; both use the same
// rules (budgetRules.js), so they can never disagree.
function ForecastLine({ forecast, currency }) {
    const estimate = forecastView(forecast);
    if (estimate.state === 'none') return null;
    if (estimate.state === 'loading') return <p className="budget__forecast">Calculating forecast…</p>;
    if (estimate.state === 'unavailable') return <p className="budget__forecast">Forecast unavailable right now. Your spending figures above are unaffected.</p>;
    return (
        <p className="budget__forecast">
            <span>
                Estimated month-end spending <strong className="num">{formatMoney(estimate.predicted, currency)}</strong>
                {estimate.confidence && <span className="budget__confidence"> · {estimate.confidence} confidence</span>}
            </span>
            {estimate.onTrack
                ? <Badge tone="success" icon={CircleCheck}>On track</Badge>
                : <Badge tone="warning" icon={TriangleAlert}>Projected over by {formatMoney(estimate.overBy, currency)}</Badge>}
        </p>
    );
}

export default function BudgetsCard({ budgets, byCategory, forecasts, currency, digits, month, periodLabel, showsForecasts, onAddBudget }) {
    return (
        <section className="card overview__budgets" aria-labelledby="budgets-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="budgets-title">Budgets</h2>
                    <p className="card__description">{periodLabel}</p>
                </div>
                {budgets.length > 0 && (
                    <button type="button" className="btn btn--secondary" onClick={onAddBudget}>
                        <Plus size={16} aria-hidden="true" /> Add budget
                    </button>
                )}
            </div>

            {!budgets.length ? (
                <EmptyState icon={Target} title="No budgets for this month"
                    message="Set a monthly limit for a category to track spending against it."
                    action={<button type="button" className="btn btn--secondary" onClick={onAddBudget}><Plus size={16} aria-hidden="true" /> Add budget</button>} />
            ) : (
                <ul className="budget-list">
                    {budgets.map(b => {
                        const status = budgetStatus(b, spentFor(byCategory, b.category), digits);
                        const tone = budgetTone(status.percent);
                        return (
                            <li key={b.id} className={`budget budget--${tone}`}>
                                <div className="budget__top">
                                    <span className="budget__category">{b.category}</span>
                                    <span className="budget__figures num">
                                        {formatMoney(status.spent, currency)} <span className="budget__of">of {formatMoney(b.monthlyLimit, currency)}</span>
                                    </span>
                                </div>
                                <div className="budget__bar" role="progressbar" aria-label={`${b.category} budget used`}
                                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(status.percent ?? 0, 100)}
                                    aria-valuetext={`${status.percent ?? 0}% used`}>
                                    <span style={{ width: `${Math.min(status.percent ?? 0, 100)}%` }} />
                                </div>
                                <p className="budget__remaining">
                                    {status.over
                                        ? <><TriangleAlert size={14} aria-hidden="true" /> Over by {formatMoney(status.remaining.slice(1), currency)} · {status.percent}% used</>
                                        : <>{formatMoney(status.remaining, currency)} left · {status.percent ?? 0}% used</>}
                                </p>
                                {showsForecasts && <ForecastLine forecast={forecasts[b.category]} currency={currency} />}
                            </li>
                        );
                    })}
                </ul>
            )}
            {showsForecasts && budgets.length > 0 && (
                <p className="overview__footnote">
                    Forecasts are estimates from this month&apos;s spending so far, using a simple trend model. Few
                    transactions mean less reliable estimates.
                </p>
            )}
            {budgets.length > 0 && (
                <div className="overview__side-footer">
                    <Link to="/budgets" state={{ month, currency }} className="btn btn--ghost overview__side-link">
                        View all budgets <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </div>
            )}
        </section>
    );
}
