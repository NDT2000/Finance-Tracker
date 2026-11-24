import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartLine, Copy, FlaskConical, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import { currentMonth, formatMoney, shiftMonth } from '../format';
import { amountForInput } from './transactions/transactionRules';
import usePlanningData from './planning/usePlanningData';
import { EventForm, PlanForm } from './planning/PlanForms';
import { FundingChecks, ProjectionChart, ProjectionTable, ResultsSummary } from './planning/PlanResults';
import { BaselineCard, EventsCard } from './planning/PlanEvents';
import { emptyPlan, shortMonth } from './planning/planningRules';
import './planning/Planning.css';

// Saved what-if scenarios (docs/design-system.md section 15, docs/financial-planning.md). The backend's
// engine calculates every projected figure; this page edits assumptions and events and displays results.
// Scenarios never create transactions or change actual totals.
export default function Planning() {
    const [searchParams, setSearchParams] = useSearchParams();
    const planId = searchParams.get('plan') ?? '';
    const [baseline, setBaseline] = useState(() => shiftMonth(currentMonth(), -1));
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const { plans, detail, isCurrent, reload } = usePlanningData(planId, baseline);
    // dialog: { kind: 'createPlan' | 'editPlan' | 'addEvent' | 'editEvent', event? } or null
    const [dialog, setDialog] = useState(null);
    const [deleting, setDeleting] = useState(null);   // { kind: 'plan' | 'event', item }
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        api.get('/api/analytics/currencies').then(({ data }) => setCurrencies(data)).catch(() => {});
    }, []);

    const { plan, events, projection } = detail;
    const ready = isCurrent && plan && projection;
    const digits = currencies.find(c => c.code === plan?.currency)?.digits ?? 2;
    // Switching scenario clears any message about the previous one
    const select = (id) => { setNotice(''); setSearchParams(id ? { plan: id } : {}); };

    function open(next) {
        setFormError('');
        setDialog(next);
    }

    // Runs one change, then reloads the list and projection from the server
    async function change(request, message, afterSuccess) {
        setBusy(true);
        setFormError('');
        try {
            const result = await request();
            setDialog(null);
            setDeleting(null);
            // Switch scenario (if the change requires it) before showing the message, so it isn't cleared
            if (afterSuccess) afterSuccess(result);
            setNotice(message);
            await reload();
        } catch (err) {
            setFormError(err.response?.data?.message || 'That change could not be saved. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const createPlan = (body) => change(() => api.post('/api/plans', body), `Created “${body.name}”.`, ({ data }) => select(data.id));
    const editPlan = (body) => change(() => api.put(`/api/plans/${planId}`, body), 'Saved the assumptions.');
    const copyPlan = () => change(() => api.post(`/api/plans/${planId}/copy`), `Copied “${plan.name}”. You're now editing the copy.`, ({ data }) => select(data.id));
    const saveEvent = (body) => dialog.kind === 'editEvent'
        ? change(() => api.put(`/api/plans/${planId}/events/${dialog.event.id}`, body), `Saved “${body.name}”.`)
        : change(() => api.post(`/api/plans/${planId}/events`, body), `Added “${body.name}”.`);
    const confirmDelete = () => (deleting.kind === 'plan'
        ? change(() => api.delete(`/api/plans/${planId}`), `Deleted “${deleting.item.name}”.`, () => select(''))
        : change(() => api.delete(`/api/plans/${planId}/events/${deleting.item.id}`), `Deleted “${deleting.item.name}”.`));

    const editInitial = plan && {
        ...plan,
        openingCash: amountForInput(plan.openingCash, digits),
        openingInvestments: amountForInput(plan.openingInvestments, digits),
        cashReserve: amountForInput(plan.cashReserve, digits),
        annualReturnPercent: String(Number(plan.annualReturnPercent)),
    };

    return (
        <div className="page planning">
            <div className="page__head">
                <div>
                    <h1 className="page__title">Financial planning</h1>
                    <p className="page__subtitle">What-if scenarios for your money</p>
                </div>
                <div className="page__actions">
                    <button type="button" className="btn btn--primary" onClick={() => open({ kind: 'createPlan' })}>
                        <Plus size={16} aria-hidden="true" /> New scenario
                    </button>
                </div>
            </div>

            {notice && (
                <div className="planning-notice" role="status">
                    <span>{notice}</span>
                    <button type="button" className="btn btn--ghost" onClick={() => setNotice('')}>Dismiss</button>
                </div>
            )}

            <div className="planning__layout">
                <nav className="card planning__list" aria-labelledby="scenarios-title">
                    <h2 className="card__title" id="scenarios-title">Scenarios</h2>
                    {!plans.loaded && <LoadingSkeleton lines={3} label="Loading scenarios…" />}
                    {plans.error && <p className="form-error" role="alert">{plans.error}</p>}
                    {plans.loaded && !plans.list.length && !plans.error && <p className="card__description">No scenarios yet.</p>}
                    <ul>
                        {plans.list.map(p => (
                            <li key={p.id}>
                                <button type="button" className={`scenario-link${p.id === planId ? ' scenario-link--active' : ''}`}
                                    aria-current={p.id === planId ? 'page' : undefined} onClick={() => select(p.id)}>
                                    <span className="scenario-link__name">{p.name}</span>
                                    <span className="scenario-link__meta">{p.currency} · {shortMonth(p.startMonth)} · {p.months} months</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="planning__workspace">
                    {!planId && plans.loaded && (
                        <div className="card">
                            <EmptyState icon={ChartLine}
                                title={plans.list.length ? 'Choose a scenario' : 'Plan your first scenario'}
                                message={plans.list.length
                                    ? 'Pick a saved scenario on the left, or create a new one.'
                                    : 'Set your starting cash and investments, then add income, spending, investing and loan payments to see how the next months could look.'}
                                action={<button type="button" className="btn btn--primary" onClick={() => open({ kind: 'createPlan' })}><Plus size={16} aria-hidden="true" /> New scenario</button>} />
                        </div>
                    )}

                    {planId && detail.error && !ready && <div className="card"><ErrorState message={detail.error} onRetry={reload} /></div>}
                    {planId && !detail.error && !ready && <div className="card"><LoadingSkeleton variant="chart" label="Loading scenario…" /></div>}

                    {ready && <>
                        <section className="card scenario-head" aria-labelledby="scenario-title">
                            <div className="scenario-head__top">
                                <div>
                                    <Badge tone="info" icon={FlaskConical}>What-if scenario</Badge>
                                    <h2 className="scenario-head__title" id="scenario-title">{plan.name}</h2>
                                </div>
                                <div className="scenario-head__actions">
                                    <button type="button" className="btn btn--secondary" onClick={() => open({ kind: 'editPlan' })} disabled={busy}>
                                        <Pencil size={16} aria-hidden="true" /> Edit assumptions
                                    </button>
                                    <button type="button" className="btn btn--secondary" onClick={copyPlan} disabled={busy}>
                                        <Copy size={16} aria-hidden="true" /> Copy
                                    </button>
                                    <button type="button" className="btn btn--ghost btn--icon scenario-head__delete" disabled={busy}
                                        onClick={() => { setFormError(''); setDeleting({ kind: 'plan', item: plan }); }}
                                        aria-label={`Delete scenario ${plan.name}`} title="Delete scenario">
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <dl className="assumptions">
                                <div><dt>Period</dt><dd>{shortMonth(plan.startMonth)} · {plan.months} months</dd></div>
                                <div><dt>Opening cash</dt><dd className="num">{formatMoney(plan.openingCash, plan.currency)}</dd></div>
                                <div><dt>Opening investments</dt><dd className="num">{formatMoney(plan.openingInvestments, plan.currency)}</dd></div>
                                <div><dt>Cash reserve</dt><dd className="num">{formatMoney(plan.cashReserve, plan.currency)}</dd></div>
                                <div><dt>Assumed growth</dt><dd className="num">{Number(plan.annualReturnPercent)}% a year</dd></div>
                            </dl>
                        </section>

                        {detail.error && <p className="form-error" role="alert">{detail.error} Showing the results loaded earlier.</p>}
                        <ResultsSummary projection={projection} plan={plan} />
                        <FundingChecks projection={projection} plan={plan} />
                        <ProjectionChart projection={projection} plan={plan} />
                        <EventsCard plan={plan} events={events} busy={busy} onAdd={() => open({ kind: 'addEvent' })}
                            onEdit={event => open({ kind: 'editEvent', event })}
                            onDelete={event => { setFormError(''); setDeleting({ kind: 'event', item: event }); }} />
                        <ProjectionTable projection={projection} plan={plan} />
                        <BaselineCard projection={projection} plan={plan} baseline={baseline} onBaselineChange={setBaseline} busy={busy} />
                    </>}
                </div>
            </div>

            <Modal open={dialog?.kind === 'createPlan' || dialog?.kind === 'editPlan'} busy={busy} onClose={() => setDialog(null)}
                title={dialog?.kind === 'editPlan' ? 'Edit assumptions' : 'New scenario'}
                description="Starting amounts and assumptions for this what-if scenario">
                <PlanForm initial={dialog?.kind === 'editPlan' ? editInitial : emptyPlan(currentMonth())} currencies={currencies}
                    currencyLocked={dialog?.kind === 'editPlan' && events.length > 0} busy={busy} error={formError}
                    submitLabel={dialog?.kind === 'editPlan' ? 'Save assumptions' : 'Create scenario'}
                    onSave={dialog?.kind === 'editPlan' ? editPlan : createPlan} onCancel={() => setDialog(null)} />
            </Modal>

            <Modal open={dialog?.kind === 'addEvent' || dialog?.kind === 'editEvent'} busy={busy} onClose={() => setDialog(null)}
                title={dialog?.kind === 'editEvent' ? 'Edit event' : 'Add event'} description={plan ? `${plan.name} · ${plan.currency}` : ''}>
                {plan && <EventForm plan={plan} digits={digits} editing={dialog?.kind === 'editEvent' ? dialog.event : null}
                    busy={busy} error={formError} onSave={saveEvent} onCancel={() => setDialog(null)} />}
            </Modal>

            <ConfirmDialog open={Boolean(deleting)} busy={busy}
                title={deleting?.kind === 'plan' ? 'Delete this scenario?' : 'Delete this event?'}
                message={deleting ? (deleting.kind === 'plan'
                    ? `“${deleting.item.name}” and its ${events.length} ${events.length === 1 ? 'event' : 'events'} will be permanently deleted. Your actual transactions are not affected.`
                    : `“${deleting.item.name}” will be removed from this scenario and the projection recalculated.`) + (formError ? ` ${formError}` : '') : ''}
                confirmLabel={deleting?.kind === 'plan' ? 'Delete scenario' : 'Delete event'}
                onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
        </div>
    );
}
