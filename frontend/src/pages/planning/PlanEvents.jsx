import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
import MonthSelector from '../../components/ui/MonthSelector';
import { EmptyState } from '../../components/ui/States';
import { formatMoney, formatMonth } from '../../format';
import { EVENT_KINDS, scheduleLabel } from './planningRules';

const directionIcons = { in: ArrowDownLeft, out: ArrowUpRight, transfer: ArrowLeftRight };

export function EventsCard({ plan, events, busy, onAdd, onEdit, onDelete }) {
    return (
        <section className="card" aria-labelledby="events-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="events-title">Planned events</h2>
                    <p className="card__description">Income, spending, investing and repayments in this scenario</p>
                </div>
                {events.length > 0 && (
                    <button type="button" className="btn btn--primary" onClick={onAdd} disabled={busy}>
                        <Plus size={16} aria-hidden="true" /> Add event
                    </button>
                )}
            </div>
            {!events.length ? (
                <EmptyState icon={CalendarRange} title="No events yet"
                    message="Add your salary, regular spending, investing or a one-off purchase to see how the scenario plays out."
                    action={<button type="button" className="btn btn--primary" onClick={onAdd} disabled={busy}><Plus size={16} aria-hidden="true" /> Add event</button>} />
            ) : (
                <ul className="event-list">
                    {events.map(event => {
                        const kind = EVENT_KINDS[event.kind];
                        const Icon = directionIcons[kind?.direction] ?? ArrowLeftRight;
                        return (
                            <li key={event.id} className={`event event--${kind?.direction}`}>
                                <span className="event__icon"><Icon size={18} aria-hidden="true" /></span>
                                <div className="event__main">
                                    <span className="event__name">{event.name}</span>
                                    <span className="event__meta">{kind?.label ?? event.kind} · {scheduleLabel(event, plan)}</span>
                                </div>
                                <span className="event__amount num">
                                    {formatMoney(event.amount, plan.currency)}{event.recurrence === 'MONTHLY' && <span className="event__per"> /month</span>}
                                </span>
                                <span className="event__actions">
                                    <button type="button" className="btn btn--ghost btn--icon" onClick={() => onEdit(event)} disabled={busy}
                                        aria-label={`Edit ${event.name}`} title="Edit"><Pencil size={16} aria-hidden="true" /></button>
                                    <button type="button" className="btn btn--ghost btn--icon event__delete" onClick={() => onDelete(event)} disabled={busy}
                                        aria-label={`Delete ${event.name}`} title="Delete"><Trash2 size={16} aria-hidden="true" /></button>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// A recorded month from the actual ledger, for reference only. Kept visually separate from the
// hypothetical results and never added to the projection.
export function BaselineCard({ projection, plan, baseline, onBaselineChange, busy }) {
    const actual = projection.actualBaseline;
    const money = (value) => formatMoney(value, plan.currency);
    return (
        <section className="card plan-baseline" aria-labelledby="baseline-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="baseline-title">Compare with a recorded month</h2>
                    <p className="card__description">Actual figures from your records</p>
                </div>
            </div>
            <div className="plan-baseline__body">
                <MonthSelector value={baseline} onChange={onBaselineChange} label="Recorded month" disabled={busy} />
                <dl className="plan-baseline__figures">
                    <div><dt>Entries</dt><dd className="num">{actual.transactionCount}</dd></div>
                    <div><dt>Income</dt><dd className="num">{money(actual.income)}</dd></div>
                    <div><dt>Net spending</dt><dd className="num">{money(actual.netExpenses)}</dd></div>
                    <div><dt>Net cash flow</dt><dd className="num">{money(actual.netSavings)}</dd></div>
                </dl>
            </div>
        </section>
    );
}
