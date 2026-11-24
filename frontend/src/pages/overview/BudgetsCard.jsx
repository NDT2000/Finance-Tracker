import { CircleCheck, Target, TriangleAlert } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../format';
import { percentOf, subtractMoney, toMinorUnits } from '../../money';

// Actual spending against each budget, plus the ML forecast for the current month.
// Colours follow the spec: red only for actual overspending, amber when close (80%+) or projected over.
function utilisationTone(percent) {
    if (percent === null) return 'neutral';
    if (percent > 100) return 'danger';
    if (percent >= 80) return 'warning';
    return 'normal';
}

function ForecastLine({ forecast, currency }) {
    if (!forecast) return null;
    if (forecast.loading) return <p className="budget__forecast">Calculating forecast…</p>;
    if (forecast.unavailable) return <p className="budget__forecast">Forecast unavailable right now. Your spending figures above are unaffected.</p>;
    const { data } = forecast;
    const onTrack = data.status === 'ON_TRACK';
    return (
        <p className="budget__forecast">
            <span>
                Estimated month-end spending <strong className="num">{formatMoney(data.predicted_month_end_total, currency)}</strong>
                {data.confidence && <span className="budget__confidence"> · {data.confidence.toLowerCase()} confidence</span>}
            </span>
            {onTrack
                ? <Badge tone="success" icon={CircleCheck}>On track</Badge>
                : <Badge tone="warning" icon={TriangleAlert}>Projected over by {formatMoney(data.overspend_amount, currency)}</Badge>}
        </p>
    );
}

export default function BudgetsCard({ budgets, byCategory, forecasts, currency, digits, periodLabel, showsForecasts, onAddBudget }) {
    const spentFor = (category) => byCategory.find(c => c.category === category)?.amount ?? '0';

    return (
        <section className="card overview__budgets" aria-labelledby="budgets-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="budgets-title">Budgets</h2>
                    <p className="card__description">{periodLabel}</p>
                </div>
            </div>

            {!budgets.length ? (
                <EmptyState icon={Target} title="No budgets for this month"
                    message="Set a monthly limit for a category to track spending against it."
                    action={<button type="button" className="btn btn--secondary" onClick={onAddBudget}>Add a budget</button>} />
            ) : (
                <ul className="budget-list">
                    {budgets.map(b => {
                        const spent = spentFor(b.category);
                        const remaining = subtractMoney(b.monthlyLimit, spent, digits);
                        const percent = percentOf(spent, b.monthlyLimit, digits);
                        const tone = utilisationTone(percent);
                        const over = toMinorUnits(remaining, digits) < 0n;
                        return (
                            <li key={b.id} className={`budget budget--${tone}`}>
                                <div className="budget__top">
                                    <span className="budget__category">{b.category}</span>
                                    <span className="budget__figures num">
                                        {formatMoney(spent, currency)} <span className="budget__of">of {formatMoney(b.monthlyLimit, currency)}</span>
                                    </span>
                                </div>
                                <div className="budget__bar" role="progressbar" aria-label={`${b.category} budget used`}
                                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(percent ?? 0, 100)}
                                    aria-valuetext={`${percent ?? 0}% used`}>
                                    <span style={{ width: `${Math.min(percent ?? 0, 100)}%` }} />
                                </div>
                                <p className="budget__remaining">
                                    {over
                                        ? <><TriangleAlert size={14} aria-hidden="true" /> Over by {formatMoney(remaining.slice(1), currency)} · {percent}% used</>
                                        : <>{formatMoney(remaining, currency)} left · {percent}% used</>}
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
        </section>
    );
}
