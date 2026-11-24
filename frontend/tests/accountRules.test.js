import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_TYPES, accountTypeLabel, accountErrors, accountBody, sortAccounts } from '../src/pages/accounts/accountRules.js';

test('account types match the backend enum', () => {
    assert.deepEqual(Object.keys(ACCOUNT_TYPES), ['CHECKING', 'SAVINGS', 'CREDIT', 'CASH']);
    assert.equal(accountTypeLabel('SAVINGS'), 'Savings');
    assert.equal(accountTypeLabel('BROKERAGE'), 'BROKERAGE');
});

test('name is required and at most 100 characters; currency is a three-letter code', () => {
    assert.deepEqual(accountErrors({ name: '  ', type: 'CHECKING', currency: 'USD' }), { name: 'Enter an account name.' });
    assert.deepEqual(accountErrors({ name: 'x'.repeat(101), type: 'CHECKING', currency: 'USD' }), { name: 'Use at most 100 characters.' });
    assert.deepEqual(accountErrors({ name: 'Everyday', type: 'CHECKING', currency: 'usd' }), { currency: 'Choose a currency.' });
    assert.deepEqual(accountErrors({ name: 'Everyday', type: 'CHECKING', currency: 'USD' }), {});
});

test('request body trims the name', () => {
    assert.deepEqual(accountBody({ name: '  Everyday  ', type: 'SAVINGS', currency: 'EUR' }), { name: 'Everyday', type: 'SAVINGS', currency: 'EUR' });
});

test('accounts are listed by name, case-insensitively', () => {
    const sorted = sortAccounts([{ id: 1, name: 'savings' }, { id: 2, name: 'Cash' }, { id: 3, name: 'Brokerage' }]);
    assert.deepEqual(sorted.map(a => a.id), [3, 2, 1]);
});
