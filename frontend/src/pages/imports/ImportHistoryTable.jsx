import Badge from '../../components/ui/Badge';
import { formatDateTime } from '../../format';
import { statusView } from './importRules';

// One page of past uploads, newest first. Cells carry data-label for the narrow-screen card layout.
export default function ImportHistoryTable({ imports, selectedId, onSelect }) {
    return (
        <div className="ledger">
            <table className="ledger__table">
                <caption className="sr-only">Import history, newest first</caption>
                <thead>
                    <tr>
                        <th scope="col">File</th>
                        <th scope="col">Uploaded</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="ledger__amount">Rows</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {imports.map(item => {
                        const status = statusView(item.status);
                        const selected = item.id === selectedId;
                        return (
                            <tr key={item.id} className={selected ? 'imports-history__selected' : undefined}>
                                <td data-label="File">
                                    <span className="ledger__description imports-filename">{item.filename}</span>
                                    <span className="ledger__sub">{item.account_ref}</span>
                                </td>
                                <td data-label="Uploaded" className="ledger__date">{formatDateTime(item.created_at)}</td>
                                <td data-label="Status"><Badge tone={status.tone}>{status.label}</Badge></td>
                                <td data-label="Rows" className="ledger__amount num">{item.total_rows ?? '—'}</td>
                                <td className="ledger__actions">
                                    <button type="button" className="btn btn--secondary imports-view" aria-current={selected || undefined}
                                        onClick={() => onSelect(item.id)}>
                                        {selected ? 'Viewing' : 'View'}<span className="sr-only"> {item.filename}</span>
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
