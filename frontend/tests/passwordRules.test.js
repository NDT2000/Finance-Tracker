import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem, passwordChangeErrors, registerErrors } from '../src/passwordRules.js';

test('length is counted in characters, the upper limit in UTF-8 bytes, like the backend', () => {
    assert.equal(passwordProblem(''), 'Enter a password.');
    assert.equal(passwordProblem('a'.repeat(14)), 'Use at least 15 characters.');
    assert.equal(passwordProblem('a'.repeat(15)), '');
});

test('emoji count as one character each', () => {
    // 15 emoji = 15 characters and 60 bytes: allowed; 19 emoji = 76 bytes: too long
    assert.equal(passwordProblem('😀'.repeat(14)), 'Use at least 15 characters.');
    assert.equal(passwordProblem('😀'.repeat(15)), '');
    assert.equal(passwordProblem('😀'.repeat(19)), 'Use a shorter password: at most 72 bytes.');
    assert.equal(passwordProblem('a'.repeat(72)), '');
    assert.equal(passwordProblem('a'.repeat(73)), 'Use a shorter password: at most 72 bytes.');
});

test('password change checks each field', () => {
    const good = 'correct-horse-battery';
    assert.deepEqual(passwordChangeErrors({ current: '', next: good, confirm: good }), { current: 'Enter your current password.' });
    assert.deepEqual(passwordChangeErrors({ current: 'x', next: 'short', confirm: 'short' }), { next: 'Use at least 15 characters.' });
    assert.deepEqual(passwordChangeErrors({ current: 'x', next: '', confirm: '' }), { next: 'Enter a new password.' });
    assert.deepEqual(passwordChangeErrors({ current: 'x', next: good, confirm: `${good}!` }), { confirm: 'The passwords do not match.' });
    assert.deepEqual(passwordChangeErrors({ current: 'x', next: good, confirm: good }), {});
});

test('registration checks name, email and password', () => {
    assert.deepEqual(registerErrors({ fullName: ' ', email: 'nope', password: 'short' }), {
        fullName: 'Enter your full name.',
        email: 'Enter a valid email address.',
        password: 'Use at least 15 characters.',
    });
    assert.deepEqual(registerErrors({ fullName: 'Sam Lee', email: 'sam@example.com', password: 'correct-horse-battery' }), {});
});
