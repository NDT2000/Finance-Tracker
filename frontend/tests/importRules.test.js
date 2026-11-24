import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_FILE_BYTES, validateFile, accountRefError, isActive, statusView, outcomeView, outcomeCounts,
    resultSummary, batchErrorMessage, parseFields, parseCandidates, rejectionReportCsv, shouldPoll, retryLabel,
} from '../src/pages/imports/importRules.js';

const csv = (over = {}) => ({ name: 'march.csv', size: 1200, type: 'text/csv', ...over });

test('file checks match the backend limits before uploading', () => {
    assert.equal(validateFile(null), 'Choose a CSV file.');
    assert.equal(validateFile(csv()), '');
    assert.equal(validateFile(csv({ name: 'MARCH.CSV', type: '' })), '');           // some browsers send no type
    assert.equal(validateFile(csv({ name: 'march.xlsx', type: 'application/vnd.ms-excel' })), 'Choose a file ending in .csv.');
    assert.equal(validateFile(csv({ size: 0 })), 'The file is empty.');
    assert.equal(validateFile(csv({ size: MAX_FILE_BYTES })), '');
    assert.equal(validateFile(csv({ size: MAX_FILE_BYTES + 1 })), 'The file is larger than 2 MB.');
});

test('account reference follows the backend pattern', () => {
    assert.equal(accountRefError('default'), '');
    assert.equal(accountRefError('chase-checking_2.0'), '');
    assert.equal(accountRefError(''), 'Enter an account reference.');
    assert.equal(accountRefError('my card'), 'Use only letters, digits, hyphens, underscores and dots.');
    assert.equal(accountRefError('x'.repeat(81)), 'Use at most 80 characters.');
});

test('only queued and processing imports are active', () => {
    assert.equal(isActive('QUEUED'), true);
    assert.equal(isActive('PROCESSING'), true);
    for (const s of ['COMPLETED', 'COMPLETED_WITH_REJECTIONS', 'NEEDS_REVIEW', 'FAILED']) assert.equal(isActive(s), false);
});

test('status labels never call an unfinished import successful', () => {
    assert.deepEqual(statusView('QUEUED'), { label: 'Queued', tone: 'pending' });
    assert.deepEqual(statusView('PROCESSING'), { label: 'Processing', tone: 'pending' });
    assert.deepEqual(statusView('COMPLETED'), { label: 'Imported', tone: 'success' });
    assert.deepEqual(statusView('COMPLETED_WITH_REJECTIONS'), { label: 'Imported with rejections', tone: 'warning' });
    assert.deepEqual(statusView('NEEDS_REVIEW'), { label: 'Needs review', tone: 'warning' });
    assert.deepEqual(statusView('FAILED'), { label: 'Failed', tone: 'danger' });
    assert.deepEqual(statusView('SOMETHING_NEW'), { label: 'SOMETHING_NEW', tone: 'pending' });
});

test('row outcomes, including revisions and pending rows', () => {
    assert.deepEqual(outcomeView('PROMOTED'), { label: 'Added', tone: 'success' });
    assert.deepEqual(outcomeView('CORRECTED'), { label: 'Revision applied', tone: 'success' });
    assert.deepEqual(outcomeView('STALE'), { label: 'Older revision', tone: 'pending' });
    assert.deepEqual(outcomeView('REJECTED'), { label: 'Rejected', tone: 'danger' });
    assert.deepEqual(outcomeView(null), { label: 'Waiting', tone: 'pending' });
});

test('counts come only from the backend, in a fixed order, zeros dropped', () => {
    const counts = [{ status: 'REJECTED', count: 2 }, { status: 'PROMOTED', count: '40' }, { status: 'DUPLICATE', count: 0 }];
    assert.deepEqual(outcomeCounts(counts), [
        { status: 'PROMOTED', label: 'Added', tone: 'success', count: 40 },
        { status: 'REJECTED', label: 'Rejected', tone: 'danger', count: 2 },
    ]);
    assert.deepEqual(outcomeCounts(undefined), []);
});

test('result summary states partial success plainly', () => {
    const batch = (status, counts, extra = {}) => ({ status, total_rows: 45, counts, ...extra });
    assert.deepEqual(resultSummary(batch('PROCESSING', [])), []);
    assert.deepEqual(resultSummary(batch('COMPLETED', [{ status: 'PROMOTED', count: 45 }])), ['All 45 rows processed.']);
    assert.deepEqual(resultSummary(batch('COMPLETED_WITH_REJECTIONS', [{ status: 'PROMOTED', count: 42 }, { status: 'REJECTED', count: 3 }])),
        ['3 of 45 rows rejected.']);
    assert.deepEqual(resultSummary(batch('NEEDS_REVIEW', [{ status: 'NEEDS_REVIEW', count: 1 }, { status: 'REJECTED', count: 2 }])),
        ['1 row needs review.', '2 of 45 rows rejected.']);
    assert.deepEqual(resultSummary(batch('FAILED', [], { error_code: 'CSV_HEADER_INVALID' })),
        ['The header row does not match the CSV format.']);
});

test('batch errors read as plain sentences, unknown codes fall back', () => {
    assert.equal(batchErrorMessage('CSV_TOO_MANY_ROWS'), 'The file has more than 5,000 rows.');
    assert.equal(batchErrorMessage('JOB_EXECUTION_ERROR'), 'Processing stopped unexpectedly.');
    assert.equal(batchErrorMessage('WHATEVER'), 'Processing failed.');
});

test('stored row values and candidates parse safely', () => {
    assert.deepEqual(parseFields('{"date":"2026-03-01","amount":"12.50"}'), { date: '2026-03-01', amount: '12.50' });
    assert.deepEqual(parseFields('not json'), {});
    assert.deepEqual(parseFields('[1,2]'), {});
    assert.deepEqual(parseCandidates('[7,9]'), [7, 9]);
    assert.deepEqual(parseCandidates(null), []);
    assert.deepEqual(parseCandidates('oops'), []);
});

test('rejection report is CSV with original fields and formula-safe cells', () => {
    const rows = [
        { row_number: 3, error_code: 'ROW_VALIDATION_FAILED', message: 'amount must be positive',
            raw_data: '{"date":"2026-03-01","category":"Food","description":"Lunch, \\"cafe\\"","amount":"-5.00","currency":"USD"}' },
        { row_number: 9, error_code: 'ROW_VALIDATION_FAILED', message: 'bad date',
            raw_data: '{"date":"03/01","category":"=HYPERLINK(1)","description":"x","amount":"1","currency":"USD","type":"REFUND"}' },
    ];
    assert.equal(rejectionReportCsv(rows), [
        'row,reason,code,date,category,description,amount,currency,type',
        '3,amount must be positive,ROW_VALIDATION_FAILED,2026-03-01,Food,"Lunch, ""cafe""",\'-5.00,USD,',
        '9,bad date,ROW_VALIDATION_FAILED,03/01,\'=HYPERLINK(1),x,1,USD,REFUND',
    ].join('\r\n') + '\r\n');
    assert.equal(rejectionReportCsv([]), 'row,reason,code\r\n');
});

test('poll only while something is queued or processing', () => {
    assert.equal(shouldPoll([{ status: 'COMPLETED' }], null), false);
    assert.equal(shouldPoll([{ status: 'COMPLETED' }, { status: 'QUEUED' }], null), true);
    assert.equal(shouldPoll([], { status: 'PROCESSING' }), true);
});

test('retry wording depends on whether the import failed', () => {
    assert.equal(retryLabel('FAILED'), 'Retry import');
    assert.equal(retryLabel('NEEDS_REVIEW'), 'Reprocess');
});
