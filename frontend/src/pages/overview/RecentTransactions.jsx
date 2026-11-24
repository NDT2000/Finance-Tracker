import { Link } from 'react-router-dom';
import { ArrowRight, Receipt } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../format';
import { TYPE_LABELS, TYPE_TONES, signFor, sortNewestFirst } from '../transactions/transactionRules';

const COUNT = 6;

// The latest entries of the selected month, read-only. Editing happens on the Transactions page.
// Refunds are labelled, so they are never mistaken for income; the +/− sign never relies on colour alone.
export default function RecentTransactions({ transactions, currency, month, onAddTransaction }) {
    const recent = sortNewestFirst(transactions).slice(0, COUNT);

    return (
        <section className="card" aria-labelledby="recent-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title" id="recent-title">Recent transactions</h2>
                    <p className="card__description">
                        {recent.length ? `Latest ${recent.length} of ${transactions.length} this month` : 'This month'}
                    </p>
                </div>
                {recent.length > 0 && (
                    <Link to="/transactions" state={{ month, currency }} className="btn btn--ghost">
                        View all <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                )}
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
                            <Badge tone={TYPE_TONES[t.type]}>{TYPE_LABELS[t.type] ?? t.type}</Badge>
                            <span className={`recent__amount num${t.type === 'EXPENSE' ? '' : ' recent__amount--in'}`}>
                                {signFor(t.type)}{formatMoney(t.amount, currency)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
