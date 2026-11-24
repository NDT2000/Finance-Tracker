import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX2, Plus, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import api from '../api/axios';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import MonthSelector from '../components/ui/MonthSelector';
import CurrencySelector from '../components/ui/CurrencySelector';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import { amountStep, currentMonth, formatMoney, formatMonth } from '../format';
import { toMinorUnits } from '../money';
import useOverviewData from './overview/useOverviewData';
import CategoryDonut from './overview/CategoryDonut';
import BudgetsCard from './overview/BudgetsCard';
import RecentTransactions from './overview/RecentTransactions';
import { DailySpendingChart, IncomeExpenseChart } from './overview/TrendCharts';
import { ImportsCard, PlanningCard } from './overview/SideCards';
import BudgetForm from './budgets/BudgetForm';
import './overview/Overview.css';

// The selected month and currency at a glance (docs/design-system.md section 12).
// All figures come from the backend; currencies are never combined.
export default function Overview() {
    const [month, setMonth] = useState(currentMonth());
    const [currency, setCurrency] = useState('USD');
    const [currencies, setCurrencies] = useState([{ code: 'USD', digits: 2 }]);
    const [addingBudget, setAddingBudget] = useState(false);
    const [budgetBusy, setBudgetBusy] = useState(false);
    const [budgetError, setBudgetError] = useState('');
    const navigate = useNavigate();
    const { summary, transactions, budgets, forecasts, loading, error, reload } = useOverviewData(month, currency);

    // Adding a transaction happens on the Transactions page, opened on the same month and currency
    const addTransaction = () => navigate('/transactions', { state: { openAdd: true, month, currency } });
    const openAddBudget = () => { setBudgetError(''); setAddingBudget(true); };

    async function saveBudget(body) {
        setBudgetBusy(true);
        setBudgetError('');
        try {
            await api.post('/api/budgets', body);
            setAddingBudget(false);
            await reload();
        } catch (err) {
            setBudgetError(err.response?.data?.message || 'The budget could not be saved. Please try again.');
        } finally {
            setBudgetBusy(false);
        }
    }

    useEffect(() => {
        api.get('/api/analytics/currencies').then(({ data }) => setCurrencies(data)).catch(() => {});
    }, []);

    const digits = currencies.find(c => c.code === currency)?.digits ?? 2;
    const periodLabel = `${formatMonth(month)} · ${currency}`;
    // Only show figures that belong to the selected month and currency (never stale ones while switching)
    const current = summary && summary.month === month && summary.currency === currency ? summary : null;
    const showsForecasts = month === new Date().toISOString().slice(0, 7);
    // Emerald for gains and red for losses; exactly zero stays neutral
    const toneOf = (value) => {
        const units = toMinorUnits(value, digits);
        return units > 0n ? 'positive' : units < 0n ? 'negative' : 'neutral';
    };

    return (
        <div className="overview">
            <div className="overview__head">
                <div>
                    <h1 className="overview__title">Overview</h1>
                    <p className="overview__subtitle">{periodLabel}</p>
                    <div className="page__actions overview__actions">
                        <button type="button" className="btn btn--primary" onClick={addTransaction}>
                            <Plus size={16} aria-hidden="true" /> Add transaction
                        </button>
                        <button type="button" className="btn btn--secondary" onClick={openAddBudget}>
                            <Plus size={16} aria-hidden="true" /> Add budget
                        </button>
                    </div>
                </div>
                <div className="overview__filters">
                    <MonthSelector value={month} onChange={setMonth} />
                    <CurrencySelector value={currency} onChange={setCurrency} currencies={currencies} />
                    <button type="button" className="btn btn--secondary btn--icon overview__refresh" onClick={reload}
                        disabled={loading} aria-label="Refresh overview" title="Refresh overview">
                        <RefreshCw size={18} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {error && !current && <div className="card"><ErrorState message={`${error} Your data is safe; please try again.`} onRetry={reload} /></div>}
            {!error && !current && <OverviewSkeleton />}

            {current && <>
                {error && <p className="overview__inline-error" role="alert">{error} Showing the figures loaded earlier.</p>}
                <div className="overview__kpis">
                    <StatCard featured icon={Wallet} label="Monthly net cash flow"
                        tone={toneOf(current.netSavings)}
                        value={formatMoney(current.netSavings, currency, { signed: true })}
                        hint="Income minus net expenses this month. Not an account balance." />
                    <StatCard icon={TrendingUp} label="Total income" tone={toneOf(current.income) === 'positive' ? 'positive' : 'neutral'} value={formatMoney(current.income, currency)} />
                    <StatCard label="Net expenses" value={formatMoney(current.netExpenses, currency)}
                        hint={`${formatMoney(current.grossExpenses, currency)} spent, ${formatMoney(current.refunds, currency)} refunded`} />
                    <StatCard label="Entries" value={current.transactionCount} hint="Manual and imported, in this month and currency" />
                </div>

                {current.transactionCount === 0 ? (
                    <div className="card">
                        <EmptyState icon={CalendarX2} title={`No entries for ${formatMonth(month)} in ${currency}`}
                            message="Add a transaction, import a CSV file, or pick another month or currency."
                            action={<button type="button" className="btn btn--primary" onClick={addTransaction}>Add a transaction</button>} />
                    </div>
                ) : (
                    <div className="overview__grid">
                        <CategoryDonut byCategory={current.byCategory} netExpenses={current.netExpenses}
                            currency={currency} digits={digits} periodLabel={periodLabel} />
                        <IncomeExpenseChart income={current.income} netExpenses={current.netExpenses}
                            currency={currency} periodLabel={periodLabel} />
                        <div className="overview__wide">
                            <DailySpendingChart byDay={current.byDay} currency={currency} periodLabel={periodLabel} />
                        </div>
                    </div>
                )}

                <div className="overview__grid">
                    <BudgetsCard budgets={budgets} byCategory={current.byCategory} forecasts={forecasts}
                        currency={currency} digits={digits} periodLabel={periodLabel}
                        showsForecasts={showsForecasts} onAddBudget={openAddBudget} />
                    <RecentTransactions transactions={transactions} currency={currency} month={month} onAddTransaction={addTransaction} />
                </div>

                <div className="overview__grid">
                    <ImportsCard imports={current.imports} />
                    <PlanningCard />
                </div>

            </>}

            <Modal open={addingBudget} busy={budgetBusy} onClose={() => setAddingBudget(false)}
                title="Add budget" description={periodLabel}>
                <BudgetForm month={month} currency={currency} step={amountStep(digits)}
                    categories={[...new Set((current?.byCategory ?? []).map(c => c.category))].sort()}
                    busy={budgetBusy} error={budgetError} onSave={saveBudget} onCancel={() => setAddingBudget(false)} />
            </Modal>
        </div>
    );
}

function OverviewSkeleton() {
    return (
        <>
            <div className="overview__kpis">
                {[0, 1, 2, 3].map(i => <div className="card" key={i}><LoadingSkeleton variant="stat" label={i === 0 ? 'Loading your overview…' : ''} /></div>)}
            </div>
            <div className="overview__grid">
                <div className="card"><LoadingSkeleton variant="chart" label="" /></div>
                <div className="card"><LoadingSkeleton variant="chart" label="" /></div>
            </div>
        </>
    );
}
