import test from 'node:test';
import assert from 'node:assert/strict';
import {
    spentFor, budgetTone, budgetStatus, forecastView, barSegments, budgetTotals, unbudgetedSpending,
} from '../src/pages/budgets/budgetRules.js';

const byCategory = [
    { category: 'Food', amount: '336.10' },
    { category: 'Transport', amount: '95.00' },
    { category: 'Housing', amount: '1450.00' },
    { category: 'Health', amount: '40.00' },
    { category: 'Gifts', amount: '-5.00' },  // refunds exceeded spending
];
const budgets = [
    { id: 1, category: 'Food', monthlyLimit: '350.00' },
    { id: 2, category: 'Transport', monthlyLimit: '80.00' },
    { id: 3, category: 'Entertainment', monthlyLimit: '60.00' },
];

test('spending per category, zero when nothing was recorded', () => {
    assert.equal(spentFor(byCategory, 'Food'), '336.10');
    assert.equal(spentFor(byCategory, 'Entertainment'), '0');
});

test('status is exact, including going over', () => {
    assert.deepEqual(budgetStatus(budgets[0], '336.10'), { spent: '336.10', remaining: '13.90', percent: 96, over: false });
    assert.deepEqual(budgetStatus(budgets[1], '95.00'), { spent: '95.00', remaining: '-15.00', percent: 118, over: true });
});

test('tone: red only when actually over, amber when close or projected over', () => {
    assert.equal(budgetTone(50), 'normal');
    assert.equal(budgetTone(80), 'warning');
    assert.equal(budgetTone(50, true), 'warning');
    assert.equal(budgetTone(101), 'danger');
    assert.equal(budgetTone(null), 'normal');
});

test('forecast view covers every state the page can be in', () => {
    assert.deepEqual(forecastView(undefined), { state: 'none' });
    assert.deepEqual(forecastView({ loading: true }), { state: 'loading' });
    assert.deepEqual(forecastView({ unavailable: true }), { state: 'unavailable' });
    assert.deepEqual(forecastView({ data: { status: 'WILL_OVERSPEND', predicted_month_end_total: 483.82, overspend_amount: 133.82, confidence: 'MEDIUM' } }),
        { state: 'ready', onTrack: false, predicted: 483.82, overBy: 133.82, confidence: 'medium' });
});

test('bar segments fit limit, spending and prediction on one scale', () => {
    // under budget, prediction beyond the limit: the prediction sets the scale
    assert.deepEqual(barSegments('350', '336.10', 483.82), { spent: 69.5, projected: 30.5, limit: 72.3 });
    // already over: spending sets the scale, the limit marker sits inside the bar
    assert.deepEqual(barSegments('80', '95', null), { spent: 100, projected: 0, limit: 84.2 });
    // a prediction below what is already spent adds nothing
    assert.deepEqual(barSegments('100', '50', 40), { spent: 50, projected: 0, limit: 100 });
});

test('totals are exact and count only budgeted categories', () => {
    assert.deepEqual(budgetTotals(budgets, byCategory), { budgeted: '490.00', spent: '431.10', remaining: '58.90', overCount: 1 });
    assert.deepEqual(budgetTotals([], byCategory), { budgeted: '0.00', spent: '0.00', remaining: '0.00', overCount: 0 });
});

test('unbudgeted spending lists positive categories without a budget, largest first', () => {
    assert.deepEqual(unbudgetedSpending(byCategory, budgets).map(c => c.category), ['Housing', 'Health']);
});
