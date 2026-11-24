import { useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { accountRefError, validateFile } from './importRules';

// CSV selection and upload. Checks the file locally first; the backend validates it again.
// progress is the upload percentage (null when not uploading, or when the browser can't tell).
export default function UploadCard({ busy, uploading, progress, onUpload }) {
    const [file, setFile] = useState(null);
    const [account, setAccount] = useState('default');
    const [errors, setErrors] = useState({});
    const input = useRef(null);

    async function submit(event) {
        event.preventDefault();
        const next = { file: validateFile(file), account: accountRefError(account) };
        setErrors(next);
        if (next.file || next.account) return;
        const done = await onUpload(file, account);
        if (done) {
            setFile(null);
            if (input.current) input.current.value = '';
        }
    }

    return (
        <section className="card" aria-labelledby="upload-title">
            <div className="card__header">
                <div>
                    <h2 className="card__title imports-title" id="upload-title"><FileUp size={18} aria-hidden="true" /> Upload CSV</h2>
                    <p className="card__description">UTF-8 · up to 2 MB · up to 5,000 rows</p>
                </div>
            </div>
            <form className="imports-upload" onSubmit={submit} noValidate>
                <div className="field">
                    <label htmlFor="import-file">CSV file</label>
                    <input id="import-file" ref={input} type="file" accept=".csv,text/csv" disabled={busy}
                        aria-invalid={Boolean(errors.file)} aria-describedby={errors.file ? 'import-file-error' : undefined}
                        onChange={e => { setFile(e.target.files[0] ?? null); setErrors(x => ({ ...x, file: '' })); }} />
                    {errors.file && <p className="field__error" id="import-file-error">{errors.file}</p>}
                </div>
                <div className="field">
                    <label htmlFor="import-account">Account reference</label>
                    <input id="import-account" value={account} maxLength={80} disabled={busy}
                        aria-invalid={Boolean(errors.account)} aria-describedby={errors.account ? 'import-account-error' : 'import-account-hint'}
                        onChange={e => { setAccount(e.target.value); setErrors(x => ({ ...x, account: '' })); }} />
                    {errors.account
                        ? <p className="field__error" id="import-account-error">{errors.account}</p>
                        : <p className="field__hint" id="import-account-hint">Use the same reference for every export from one account.</p>}
                </div>
                <div className="imports-upload__submit">
                    <button type="submit" className="btn btn--primary" disabled={busy}>
                        <Upload size={16} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Upload CSV'}
                    </button>
                </div>
            </form>
            {uploading && (
                <div className="imports-progress" role="status">
                    <span>{progress === null ? 'Uploading file…' : `Uploading file: ${progress}%`}</span>
                    {progress !== null && <progress max="100" value={progress} aria-hidden="true" />}
                </div>
            )}
            <details className="imports-details">
                <summary>CSV format</summary>
                <dl className="imports-details__list">
                    <dt>Required columns</dt><dd><code>date, category, description, amount, currency</code></dd>
                    <dt>Optional columns</dt><dd><code>type, source_transaction_id, revision, refund_of</code></dd>
                    <dt>date</dt><dd>YYYY-MM-DD</dd>
                    <dt>amount</dt><dd>Positive number, no thousands separators</dd>
                    <dt>currency</dt><dd>Three-letter code, for example USD</dd>
                    <dt>type</dt><dd>EXPENSE (default), INCOME or REFUND</dd>
                    <dt>refund_of</dt><dd>The source_transaction_id of the refunded expense</dd>
                    <dt>revision</dt><dd>1 or higher; a higher revision replaces the row with the same source_transaction_id</dd>
                </dl>
            </details>
        </section>
    );
}
