import test from 'node:test';
import assert from 'node:assert/strict';
import {
    EVENT_KINDS, monthAt, shortMonth, monthOptions, scheduleLabel, planPayload, eventPayload, finalCombinedValue, fundingChecks,
} from '../src/pages/planning/planningRules.js';

const plan = { startMonth: '2026-11', months: 3 };

test('every backend event type has a label and an explained effect', () => {
    assert.deepEqual(Object.keys(EVENT_KINDS).sort(), ['EXPENSE', 'INCOME', 'INVESTMENT', 'LOAN_REPAYMENT', 'WITHDRAWAL']);
    for (const kind of Object.values(EVENT_KINDS)) assert.ok(kind.label && kind.effect);
});

test('plan months map to calendar months across year ends', () => {
    assert.equal(monthAt('2026-11', 1), '2026-11');
    assert.equal(monthAt('2026-11', 3), '2027-01');
    assert.equal(monthAt('2026-01', 36), '2028-12');
    assert.equal(shortMonth('2027-01', 'en-US'), 'Jan 2027');
});

test('month options name each plan month', () => {
    assert.deepEqual(monthOptions(plan, 'en-US'), [
        { value: 1, label: 'Nov 2026' }, { value: 2, label: 'Dec 2026' }, { value: 3, label: 'Jan 2027' },
    ]);
});

test('schedules read naturally', () => {
    assert.equal(scheduleLabel({ recurrence: 'ONCE', firstMonth: 2, lastMonth: 2 }, plan, 'en-US'), 'Dec 2026');
    assert.equal(scheduleLabel({ recurrence: 'MONTHLY', firstMonth: 1, lastMonth: 3 }, plan, 'en-US'), 'Nov 2026 – Jan 2027 (3 months)');
    assert.equal(scheduleLabel({ recurrence: 'MONTHLY', firstMonth: 2, lastMonth: 2 }, plan, 'en-US'), 'Dec 2026 – Dec 2026 (1 month)');
});

test('payloads keep amounts exact and make a one-time event end where it starts', () => {
    const body = planPayload({ name: ' Move ', currency: 'USD', startMonth: '2026-11', months: '12', openingCash: '1000.10', openingInvestments: '0', cashReserve: '600', annualReturnPercent: '4.5' });
    assert.equal(body.name, 'Move');
    assert.equal(body.months, 12);
    assert.equal(body.openingCash, '1000.10');
    const once = eventPayload({ name: 'Laptop', kind: 'EXPENSE', recurrence: 'ONCE', amount: '1200', firstMonth: '4', lastMonth: '12' });
    assert.deepEqual(once, { name: 'Laptop', kind: 'EXPENSE', recurrence: 'ONCE', amount: '1200', firstMonth: 4, lastMonth: 4 });
    assert.equal(eventPayload({ name: 'Rent', kind: 'EXPENSE', recurrence: 'MONTHLY', amount: '900', firstMonth: '1', lastMonth: '12' }).lastMonth, 12);
});

test('combined value is read from the backend, never recalculated', () => {
    assert.equal(finalCombinedValue({ months: [{ cashAndInvestments: '1900.00' }, { cashAndInvestments: '2700.00' }] }), '2700.00');
    assert.equal(finalCombinedValue({ months: [] }), null);
});

test('funding checks list problems by severity, or one all-clear', () => {
    const clear = fundingChecks({ firstCashShortfall: null, firstBelowReserve: null, totalUnfundedWithdrawals: '0.00' }, 'en-US');
    assert.deepEqual(clear.map(c => c.tone), ['success']);
    const problems = fundingChecks({ firstCashShortfall: '2027-02', firstBelowReserve: '2026-12', totalUnfundedWithdrawals: '50.00' }, 'en-US');
    assert.deepEqual(problems.map(c => c.tone), ['danger', 'danger', 'warning']);
    assert.equal(problems[0].title, 'Cash runs out in Feb 2027');
    assert.equal(problems[1].amount, '50.00');
});
