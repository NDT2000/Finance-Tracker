import { Receipt } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../format';

const COUNT = 6;

// How each type reads in the list. Refunds are labelled, so they are never mistaken for income.
const typeLabel = { INCOME: 'Income', EXPENSE: 'Expense', REFUND: 'Refund' };
const typeTone = { INCOME: 'success', EXPENSE: 'pending', REFUND: 'info' };

// Money in shows a +, money out a −; the type label says which, so colour is never the only cue.
function signedAmount(t, currency) {
    const amount = formatMoney(t.amount, currency);
    return t.type === 'EXPENSE' ? `−${amount}` : `+${amount}`;
}

// The latest entries of the selected month, read-only. Editing actions are in "Manage entries".
export default function RecentTransactions({ transactions, currency, onAddTransaction }) {
    const recent = [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        .slice(0, COUNT);

    return (
        <section className="card" aria-labelledby="recent-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="recent-title">Recent transactions</h2>
                    <p className="card__description">Latest {Math.min(COUNT, transactions.length) || ''} of {transactions.length} this month</p>
                </div>
            </div>
            {!recent.length ? (
                <EmptyState icon={Receipt} title="No transactions this month"
                    message="Add a transaction or import a CSV file to see it here."
                    action={<button type="button" className="btn btn--secondary" onClick={onAddTransaction}>Add a transaction</button>} />
            ) : (
                <ul className="recent-list">
                    {recent.map(t => (
                        <li key={t.id}>
                            <div className="recent__main">
                                <span className="recent__description">{t.description}</span>
                                <span className="recent__meta">
                                    {new Date(`${t.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    {' · '}{t.category}
                                    {t.bankAccountName && <>{' · '}{t.bankAccountName}</>}
                                </span>
                            </div>
                            <Badge tone={typeTone[t.type]}>{typeLabel[t.type] ?? t.type}</Badge>
                            <span className={`recent__amount num${t.type === 'EXPENSE' ? '' : ' recent__amount--in'}`}>
                                {signedAmount(t, currency)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
