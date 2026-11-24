import { Link } from 'react-router-dom';
import { Landmark, Pencil, Trash2 } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatMoney } from '../../format';
import { TYPE_LABELS, TYPE_TONES, allowedActions, signFor } from './transactionRules';

// The page shows one month, so the year is left out
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// The ledger. Each cell carries data-label so narrow screens can show rows as labelled cards (see CSS).
export default function TransactionTable({ rows, currency, busy, onEdit, onAssign, onExclude }) {
    return (
        <div className="ledger">
            <table className="ledger__table">
                <caption className="sr-only">Transactions, newest first</caption>
                <thead>
                    <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Description</th>
                        <th scope="col">Account</th>
                        <th scope="col">Source</th>
                        <th scope="col" className="ledger__amount">Amount</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(t => {
                        const can = allowedActions(t);
                        return (
                            <tr key={t.id}>
                                <td data-label="Date" className="ledger__date">{shortDate(t.date)}</td>
                                <td data-label="Description">
                                    <span className="ledger__description">{t.description}</span>
                                    <span className="ledger__sub">
                                        <Badge tone={TYPE_TONES[t.type]}>{TYPE_LABELS[t.type] ?? t.type}</Badge>
                                        {t.type === 'REFUND' && t.refundOf && <span>of #{t.refundOf}</span>}
                                        <span>{t.category}</span>
                                        <span className="ledger__id">#{t.id}</span>
                                    </span>
                                </td>
                                <td data-label="Account">
                                    {t.bankAccountName || <span className="ledger__muted">Unassigned</span>}
                                    {t.bankAccountName && !t.bankAccountId && <span className="ledger__sub ledger__muted">Account deleted</span>}
                                </td>
                                <td data-label="Source">
                                    {t.origin === 'IMPORTED' ? (
                                        <span className="ledger__source">
                                            <Badge tone="info">Imported</Badge>
                                            {t.importBatchId && <Link to="/imports" className="ledger__link">View import</Link>}
                                        </span>
                                    ) : <Badge tone="pending">Manual</Badge>}
                                </td>
                                <td data-label="Amount" className={`ledger__amount num${t.type === 'EXPENSE' ? '' : ' ledger__amount--in'}`}>
                                    {signFor(t.type)}{formatMoney(t.amount, t.currency ?? currency)}
                                </td>
                                <td className="ledger__actions">
                                    {can.edit && (
                                        <button type="button" className="btn btn--ghost btn--icon" disabled={busy}
                                            onClick={() => onEdit(t)} aria-label={`Edit ${t.description}, #${t.id}`} title="Edit">
                                            <Pencil size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                    {can.assignBank && (
                                        <button type="button" className="btn btn--ghost btn--icon" disabled={busy}
                                            onClick={() => onAssign(t)} aria-label={`Change account for ${t.description}, #${t.id}`} title="Change account">
                                            <Landmark size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                    <button type="button" className="btn btn--ghost btn--icon ledger__danger" disabled={busy}
                                        onClick={() => onExclude(t)} aria-label={`Exclude ${t.description}, #${t.id}`} title="Exclude from totals">
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
