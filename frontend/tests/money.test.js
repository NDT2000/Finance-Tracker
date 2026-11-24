import test from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, fromMinorUnits, subtractMoney, percentOf } from '../src/money.js';

test('subtraction is exact where floating point is not', () => {
    assert.notEqual(350 - 335.95, 14.05); // the problem this module exists to avoid
    assert.equal(subtractMoney('350', '335.95'), '14.05');
    assert.equal(subtractMoney('0.3', '0.1'), '0.20');
});

test('negative results keep their sign, including amounts under one unit', () => {
    assert.equal(subtractMoney('100', '133.82'), '-33.82');
    assert.equal(subtractMoney('0.10', '0.15'), '-0.05');
});

test('currencies with other decimal places', () => {
    assert.equal(subtractMoney('1000', '250', 0), '750');
    assert.equal(subtractMoney('1.5', '0.125', 3), '1.375');
});

test('conversion round-trips and rejects too many decimals', () => {
    assert.equal(toMinorUnits('4200.00'), 420000n);
    assert.equal(fromMinorUnits(420000n), '4200.00');
    assert.equal(toMinorUnits('-12.5'), -1250n);
    assert.throws(() => toMinorUnits('1.005', 2));
    assert.throws(() => toMinorUnits('abc'));
});

test('percentOf rounds down and handles a zero total', () => {
    assert.equal(percentOf('335.95', '350'), 95);
    assert.equal(percentOf('420', '350'), 120);
    assert.equal(percentOf('0', '60'), 0);
    assert.equal(percentOf('10', '0'), null);
});
