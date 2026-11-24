import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleAlert, PiggyBank, Plus, Target, Wallet } from 'lucide-react';
import api from '../api/axios';
import MonthSelector from '../components/ui/MonthSelector';
import CurrencySelector from '../components/ui/CurrencySelector';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import { amountStep, currentMonth, formatMoney, formatMonth } from '../format';
import { toMinorUnits } from '../money';
import useOverviewData from './overview/useOverviewData';
import BudgetCard from './budgets/BudgetCard';
import BudgetForm from './budgets/BudgetForm';
import BudgetLimitForm from './budgets/BudgetLimitForm';
import { budgetTotals, spentFor, unbudgetedSpending } from './budgets/budgetRules';
import './budgets/Budgets.css';

// Monthly category budgets with actual spending and ML month-end estimates (docs/design-system.md §14).
export default function Budgets() {
    const location = useLocation();
    const navigate = useNavigate();
    // "View all budgets" on the overview passes its month and currency
    const [month, setMonth] = useState(location.state?.month ?? currentMonth());
    const [currency, setCurrency] = useState(location.state?.currency ?? 'USD');
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const { summary, budgets, forecasts, error, reload } = useOverviewData(month, currency);
    // dialog: { kind: 'add', category? } | { kind: 'edit', budget } or null
    const [dialog, setDialog] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');

    // Clear the one-off router state so a reload starts from the current month
    useEffect(() => {
        if (location.state) navigate(location.pathname, { replace: true, state: null });
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        api.get('/api/analytics/currencies').then(({ data }) => setCurrencies(data)).catch(() => {});
    }, []);

    const digits = currencies.find(c => c.code === currency)?.digits ?? 2;
    const current = summary && summary.month === month && summary.currency === currency ? summary : null;
    const byCategory = current?.byCategory ?? [];
    // The backend forecasts the current month in UTC
    const forecastsAvailable = month === new Date().toISOString().slice(0, 7);
    const sorted = useMemo(() => [...budgets].sort((a, b) => a.category.localeCompare(b.category)), [budgets]);
    const totals = budgetTotals(budgets, byCategory, digits);
    const unbudgeted = unbudgetedSpending(byCategory, budgets, digits);
    const money = (value) => formatMoney(value, currency);
    const remainingNegative = toMinorUnits(totals.remaining, digits) < 0n;

    function open(next) {
        setFormError('');
        setDialog(next);
    }

    async function change(request, message) {
        setBusy(true);
        setFormError('');
        try {
            await request();
            setDialog(null);
            setDeleting(null);
            setNotice(message);
            await reload();
        } catch (err) {
            setFormError(err.response?.data?.message || 'That change could not be saved. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const add = (body) => change(() => api.post('/api/budgets', body), `Added a ${body.category} budget.`);
    const edit = (body) => change(() => api.put(`/api/budgets/${dialog.budget.id}`, body), `Updated the ${body.category} limit.`);
    const remove = () => change(() => api.delete(`/api/budgets/${deleting.id}`), `Deleted the ${deleting.category} budget.`);

    return (
        <div className="page">
            <div className="page__head">
                <div>
                    <h1 className="page__title">Budgets</h1>
                    <p className="page__subtitle">{formatMonth(month)} · {currency}</p>
                </div>
                <div className="page__actions">
                    <button type="button" className="btn btn--primary" onClick={() => open({ kind: 'add' })}>
                        <Plus size={16} aria-hidden="true" /> Add budget
                    </button>
                </div>
            </div>

            <div className="card budgets-filters">
                <MonthSelector value={month} onChange={setMonth} />
                <CurrencySelector value={currency} onChange={setCurrency} currencies={currencies} />
            </div>

            {notice && (
                <div className="budgets-notice" role="status">
                    <span>{notice}</span>
                    <button type="button" className="btn btn--ghost" onClick={() => setNotice('')}>Dismiss</button>
                </div>
            )}

            {error && !current && <div className="card"><ErrorState message={`${error} Your budgets are safe; please try again.`} onRetry={reload} /></div>}
            {!error && !current && <div className="card"><LoadingSkeleton lines={5} label="Loading budgets…" /></div>}

            {current && <>
                {error && <p className="form-error" role="alert">{error} Showing the figures loaded earlier.</p>}

                {budgets.length > 0 && (
                    <div className="budgets-summary">
                        <StatCard icon={Target} label="Total budgeted" value={money(totals.budgeted)} hint={`${budgets.length} ${budgets.length === 1 ? 'category' : 'categories'}`} />
                        <StatCard icon={Wallet} label="Spent in budgeted categories" value={money(totals.spent)} hint="Expenses minus refunds" />
                        <StatCard icon={PiggyBank} label={remainingNegative ? 'Over in total' : 'Remaining'}
                            tone={remainingNegative ? 'negative' : 'neutral'}
                            value={remainingNegative ? money(totals.remaining.slice(1)) : money(totals.remaining)} />
                        <StatCard icon={CircleAlert} label="Over budget" tone={totals.overCount ? 'negative' : 'neutral'}
                            value={totals.overCount} hint={totals.overCount ? 'Spending already above the limit' : 'No budget exceeded so far'} />
                    </div>
                )}

                {!budgets.length ? (
                    <div className="card">
                        <EmptyState icon={Target} title={`No budgets for ${formatMonth(month)} in ${currency}`}
                            message="Set a monthly limit for a category to track spending against it."
                            action={<button type="button" className="btn btn--primary" onClick={() => open({ kind: 'add' })}><Plus size={16} aria-hidden="true" /> Add budget</button>} />
                    </div>
                ) : <>
                    <div className="budget-legend" aria-hidden="true">
                        <span><i className="budget-legend__spent" /> Spent so far (actual)</span>
                        {forecastsAvailable && <span><i className="budget-legend__projected" /> Estimated by month end</span>}
                        <span><i className="budget-legend__limit" /> Limit</span>
                    </div>
                    <div className="budgets-grid">
                        {sorted.map(b => (
                            <BudgetCard key={b.id} budget={b} spent={spentFor(byCategory, b.category)} forecast={forecasts[b.category]}
                                currency={currency} digits={digits} forecastsAvailable={forecastsAvailable} busy={busy}
                                onEdit={budget => open({ kind: 'edit', budget })} onDelete={budget => { setFormError(''); setDeleting(budget); }} />
                        ))}
                    </div>
                    <p className="budgets-footnote">
                        {forecastsAvailable
                            ? `Month-end figures are estimates for ${formatMonth(month)}, projected from this month's spending so far with a simple trend model. They are not guaranteed, and fewer transactions give less reliable estimates.`
                            : 'Month-end estimates are only made for the current month.'}
                    </p>
                </>}

                {unbudgeted.length > 0 && (
                    <section className="card" aria-labelledby="unbudgeted-title">
                        <div className="card__header">
                            <div>
                                <h2 className="card__title" id="unbudgeted-title">Spending without a budget</h2>
                                <p className="card__description">Categories with spending in {formatMonth(month)} and no limit set</p>
                            </div>
                        </div>
                        <ul className="unbudgeted-list">
                            {unbudgeted.map(c => (
                                <li key={c.category}>
                                    <span className="unbudgeted-list__name">{c.category}</span>
                                    <span className="num">{money(c.amount)}</span>
                                    <button type="button" className="btn btn--secondary" onClick={() => open({ kind: 'add', category: c.category })}>
                                        Set budget<span className="sr-only"> for {c.category}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </>}

            <Modal open={dialog?.kind === 'add'} busy={busy} onClose={() => setDialog(null)} title="Add budget" description={`${formatMonth(month)} · ${currency}`}>
                <BudgetForm month={month} currency={currency} step={amountStep(digits)} initialCategory={dialog?.category ?? ''}
                    categories={[...new Set(byCategory.map(c => c.category))].filter(c => !budgets.some(b => b.category === c)).sort()}
                    busy={busy} error={formError} onSave={add} onCancel={() => setDialog(null)} />
            </Modal>

            <Modal open={dialog?.kind === 'edit'} busy={busy} onClose={() => setDialog(null)}
                title={dialog?.budget ? `Edit ${dialog.budget.category} limit` : 'Edit limit'} description={`${formatMonth(month)} · ${currency}`}>
                {dialog?.budget && <BudgetLimitForm budget={dialog.budget} digits={digits} step={amountStep(digits)}
                    busy={busy} error={formError} onSave={edit} onCancel={() => setDialog(null)} />}
            </Modal>

            <ConfirmDialog open={Boolean(deleting)} busy={busy} title={deleting ? `Delete the ${deleting.category} budget?` : ''}
                message={deleting ? `The ${money(deleting.monthlyLimit)} limit for ${formatMonth(month)} will be removed. Your transactions are not affected.${formError ? ` ${formError}` : ''}` : ''}
                confirmLabel="Delete budget" onConfirm={remove} onCancel={() => setDeleting(null)} />
        </div>
    );
}
