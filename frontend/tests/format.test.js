import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, amountStep, currentMonth, formatMonth, shiftMonth, formatAxisMoney, formatDateTime } from '../src/format.js';

test('formatMoney uses each currency\'s own decimal places', () => {
    assert.equal(formatMoney('1234.5', 'USD', { locale: 'en-US' }), '$1,234.50');
    assert.equal(formatMoney('1234', 'JPY', { locale: 'en-US' }), '¥1,234');
});

test('formatMoney keeps decimal strings exact', () => {
    // 0.1 + 0.2 style float errors must never reach the screen
    assert.equal(formatMoney('40.10', 'USD', { locale: 'en-US' }), '$40.10');
    assert.equal(formatMoney('9007199254740993.25', 'USD', { locale: 'en-US' }), '$9,007,199,254,740,993.25');
});

test('formatMoney shows signs only when asked, and a dash for missing values', () => {
    assert.equal(formatMoney('40', 'USD', { locale: 'en-US', signed: true }), '+$40.00');
    assert.equal(formatMoney('-40', 'USD', { locale: 'en-US', signed: true }), '-$40.00');
    assert.equal(formatMoney('0', 'USD', { locale: 'en-US', signed: true }), '$0.00');
    assert.equal(formatMoney(null, 'USD'), '—');
});

test('amountStep matches the currency minor unit', () => {
    assert.equal(amountStep(2), '0.01');
    assert.equal(amountStep(3), '0.001');
    assert.equal(amountStep(0), '1');
});

test('formatAxisMoney keeps chart axis labels short', () => {
    assert.equal(formatAxisMoney(1600, 'USD', { locale: 'en-US' }), '$1.6K');
    assert.equal(formatAxisMoney(250, 'USD', { locale: 'en-US' }), '$250');
    assert.equal(formatAxisMoney(0, 'USD', { locale: 'en-US' }), '$0');
});

test('month helpers', () => {
    assert.equal(currentMonth(new Date(2026, 10, 23)), '2026-11');
    assert.equal(formatMonth('2026-11', 'en-US'), 'November 2026');
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(shiftMonth('2026-05', 0), '2026-05');
});

test('date and time for timestamps, a dash when missing', () => {
    assert.equal(formatDateTime('2026-11-24T19:41:00Z', 'en-US', 'UTC'), 'Nov 24, 2026, 7:41 PM');
    assert.equal(formatDateTime(null), '—');
});
