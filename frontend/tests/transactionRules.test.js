import test from 'node:test';
import assert from 'node:assert/strict';
import {
    filterTransactions, sortNewestFirst, allowedActions, amountForInput, createPayload, updatePayload, signFor,
} from '../src/pages/transactions/transactionRules.js';

const entries = [
    { id: 1, date: '2026-11-02', description: 'Rent', category: 'Housing', type: 'EXPENSE', origin: 'MANUAL', bankAccountId: 7, bankAccountName: 'Everyday Checking' },
    { id: 2, date: '2026-11-04', description: 'Groceries', category: 'Food', type: 'EXPENSE', origin: 'IMPORTED', bankAccountId: null },
    { id: 3, date: '2026-11-04', description: 'Grocery refund', category: 'Food', type: 'REFUND', origin: 'MANUAL', bankAccountId: 7, refundOf: 2 },
    { id: 4, date: '2026-11-01', description: 'Salary', category: 'Salary', type: 'INCOME', origin: 'MANUAL', bankAccountId: 9 },
];

test('sorting: newest date first, later-added first within a day', () => {
    assert.deepEqual(sortNewestFirst(entries).map(e => e.id), [3, 2, 1, 4]);
});

test('filters combine: text, type, bank account and source', () => {
    const ids = (filters) => filterTransactions(entries, filters).map(e => e.id);
    assert.deepEqual(ids({ search: 'GROC' }), [2, 3]);                 // case-insensitive, description
    assert.deepEqual(ids({ search: 'everyday' }), [1]);                 // bank account name
    assert.deepEqual(ids({ type: 'REFUND' }), [3]);
    assert.deepEqual(ids({ bank: 'none' }), [2]);
    assert.deepEqual(ids({ bank: '7' }), [1, 3]);
    assert.deepEqual(ids({ source: 'IMPORTED' }), [2]);
    assert.deepEqual(ids({ type: 'EXPENSE', source: 'MANUAL' }), [1]);
    assert.deepEqual(ids({}), [1, 2, 3, 4]);
});

test('actions mirror the backend rules', () => {
    assert.deepEqual(allowedActions(entries[0]), { edit: true, assignBank: true, exclude: true });
    assert.equal(allowedActions(entries[1]).edit, false);       // imported
    assert.equal(allowedActions(entries[2]).assignBank, false); // refund
});

test('signs: money out is minus, money in (income and refunds) is plus', () => {
    assert.equal(signFor('EXPENSE'), '−');
    assert.equal(signFor('INCOME'), '+');
    assert.equal(signFor('REFUND'), '+');
});

test('amounts from the API are trimmed to the currency\'s decimals for editing', () => {
    assert.equal(amountForInput('86.4000', 2), '86.40');
    assert.equal(amountForInput('1500.0000', 0), '1500');
});

test('create payload: refunds never send a bank account, others send a number or null', () => {
    const base = { description: ' Coffee ', amount: '4.75', type: 'EXPENSE', category: 'Food', date: '2026-11-06', refundOf: '', bankAccountId: '7' };
    assert.deepEqual(createPayload(base, 'USD'), {
        description: 'Coffee', amount: '4.75', type: 'EXPENSE', category: 'Food', date: '2026-11-06', currency: 'USD', refundOf: null, bankAccountId: 7,
    });
    assert.equal(createPayload({ ...base, bankAccountId: '' }, 'USD').bankAccountId, null);
    const refund = createPayload({ ...base, type: 'REFUND', refundOf: '2' }, 'USD');
    assert.equal(refund.refundOf, 2);
    assert.equal(refund.bankAccountId, null);
});

test('update payload keeps every stored field the form does not edit', () => {
    const stored = { id: 3, type: 'REFUND', currency: 'USD', accountRef: 'default', refundOf: 2, bankAccountId: 7 };
    const form = { description: 'Partial refund', amount: '5.00', type: 'EXPENSE', category: 'Food', date: '2026-11-05', bankAccountId: '' };
    const body = updatePayload(stored, form);
    assert.equal(body.type, 'REFUND');      // a refund cannot be turned into another type
    assert.equal(body.refundOf, 2);         // the refund link survives
    assert.equal(body.bankAccountId, 7);    // and so does the inherited account
    assert.equal(body.accountRef, 'default');
    assert.equal(body.currency, 'USD');

    const expense = { id: 1, type: 'EXPENSE', currency: 'EUR', accountRef: 'sample', refundOf: null, bankAccountId: 7 };
    const unassigned = updatePayload(expense, { ...form, type: 'INCOME', bankAccountId: '' });
    assert.equal(unassigned.type, 'INCOME');
    assert.equal(unassigned.bankAccountId, null);   // explicitly unassigned in the form
    assert.equal(unassigned.currency, 'EUR');       // never switched to the page's currency
    assert.equal(unassigned.accountRef, 'sample');
});
