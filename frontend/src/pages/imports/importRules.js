// Pure rules for the import page. Limits and statuses mirror docs/pipeline/contract.md; every count
// shown comes from the backend, and nothing here decides whether an import succeeded.

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const HISTORY_PAGE = 50;
export const ROWS_PAGE = 100;

// Checked before uploading so obvious mistakes don't need a round trip. The backend checks again.
export function validateFile(file) {
    if (!file) return 'Choose a CSV file.';
    if (!file.name.toLowerCase().endsWith('.csv')) return 'Choose a file ending in .csv.';
    if (file.size === 0) return 'The file is empty.';
    if (file.size > MAX_FILE_BYTES) return 'The file is larger than 2 MB.';
    return '';
}

export function accountRefError(ref) {
    if (!ref) return 'Enter an account reference.';
    if (ref.length > 80) return 'Use at most 80 characters.';
    if (!/^[A-Za-z0-9_.-]+$/.test(ref)) return 'Use only letters, digits, hyphens, underscores and dots.';
    return '';
}

export const isActive = status => status === 'QUEUED' || status === 'PROCESSING';

const STATUSES = {
    QUEUED: { label: 'Queued', tone: 'pending' },
    PROCESSING: { label: 'Processing', tone: 'pending' },
    COMPLETED: { label: 'Imported', tone: 'success' },
    COMPLETED_WITH_REJECTIONS: { label: 'Imported with rejections', tone: 'warning' },
    NEEDS_REVIEW: { label: 'Needs review', tone: 'warning' },
    FAILED: { label: 'Failed', tone: 'danger' },
};

export const statusView = status => STATUSES[status] ?? { label: status, tone: 'pending' };

// Display order for row outcomes: what reached the ledger first, then what was held back.
const OUTCOMES = {
    PROMOTED: { label: 'Added', tone: 'success' },
    CORRECTED: { label: 'Revision applied', tone: 'success' },
    LINKED: { label: 'Linked to existing', tone: 'success' },
    NEEDS_REVIEW: { label: 'Needs review', tone: 'warning' },
    REJECTED: { label: 'Rejected', tone: 'danger' },
    DUPLICATE: { label: 'Duplicate', tone: 'pending' },
    STALE: { label: 'Older revision', tone: 'pending' },
    IGNORED: { label: 'Ignored', tone: 'pending' },
};

export const outcomeView = outcome => (outcome ? OUTCOMES[outcome] ?? { label: outcome, tone: 'pending' } : { label: 'Waiting', tone: 'pending' });

export function outcomeCounts(counts = []) {
    const byStatus = new Map(counts.map(c => [c.status, Number(c.count)]));
    return Object.keys(OUTCOMES)
        .filter(status => byStatus.get(status) > 0)
        .map(status => ({ status, ...OUTCOMES[status], count: byStatus.get(status) }));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Short statements for a finished import. Empty while it is still running.
export function resultSummary(batch) {
    if (isActive(batch.status)) return [];
    if (batch.status === 'FAILED') return [batchErrorMessage(batch.error_code)];
    const count = status => Number(batch.counts?.find(c => c.status === status)?.count ?? 0);
    const lines = [];
    const review = count('NEEDS_REVIEW');
    const rejected = count('REJECTED');
    if (review) lines.push(`${plural(review, 'row')} ${review === 1 ? 'needs' : 'need'} review.`);
    if (rejected) lines.push(`${rejected} of ${plural(batch.total_rows, 'row')} rejected.`);
    if (!lines.length && batch.status === 'COMPLETED') lines.push(`All ${plural(batch.total_rows, 'row')} processed.`);
    return lines;
}

const ERRORS = {
    CSV_EMPTY: 'The file has no rows.',
    CSV_HEADER_INVALID: 'The header row does not match the CSV format.',
    CSV_TOO_MANY_ROWS: 'The file has more than 5,000 rows.',
    CSV_FORMAT_INVALID: 'The file is not valid CSV.',
    CSV_ENCODING_OR_FORMAT_INVALID: 'The file is not valid UTF-8 CSV.',
    JOB_EXECUTION_ERROR: 'Processing stopped unexpectedly.',
    LEASE_EXHAUSTED: 'Processing stopped unexpectedly.',
};

export const batchErrorMessage = code => ERRORS[code] ?? 'Processing failed.';

// raw_data holds the original CSV fields as a JSON object
export function parseFields(raw) {
    try {
        const value = JSON.parse(raw);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

export function parseCandidates(raw) {
    try {
        const value = JSON.parse(raw ?? '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

const COLUMNS = ['date', 'category', 'description', 'amount', 'currency', 'type', 'source_transaction_id', 'revision', 'refund_of'];

// Same rule as the backend transaction export: a leading = + - @ (even after spaces) or a leading
// tab/newline would be run as a formula by spreadsheets, so prefix it with an apostrophe.
function safeCell(value) {
    const text = value == null ? '' : String(value);
    const significant = text.trimStart();
    const risky = (significant && '=+-@'.includes(significant[0])) || (text && '\t\r\n'.includes(text[0]));
    const safe = risky ? `'${text}` : text;
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

// Rejected rows as a CSV file: the reason, then the original columns as uploaded.
export function rejectionReportCsv(rows) {
    const fields = rows.map(r => parseFields(r.raw_data));
    const present = new Set(fields.flatMap(Object.keys));
    const columns = [...COLUMNS.filter(c => present.has(c)), ...[...present].filter(c => !COLUMNS.includes(c)).sort()];
    const lines = [['row', 'reason', 'code', ...columns]];
    rows.forEach((r, i) => lines.push([r.row_number, r.message, r.error_code, ...columns.map(c => fields[i][c])]));
    return lines.map(line => line.map(safeCell).join(',')).join('\r\n') + '\r\n';
}

export const shouldPoll = (history, batch) => history.some(b => isActive(b.status)) || Boolean(batch && isActive(batch.status));

export const retryLabel = status => (status === 'FAILED' ? 'Retry import' : 'Reprocess');
