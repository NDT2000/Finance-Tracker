import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from '../src/api/axios.js';

function unauthorized(config) {
    return Promise.reject({ config, response: { status: 401 } });
}
function response(config, data = {}) { return Promise.resolve({ config, data, status: 200, headers: {} }); }

test('simultaneous expired requests rotate only once and retry with memory token', async () => {
    const client = createAuthClient();
    let refreshes = 0;
    client.login('expired', {});
    client.auth.defaults.adapter = async config => {
        refreshes++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return response(config, { token: 'fresh', email: 'user@example.com', fullName: 'User' });
    };
    client.api.defaults.adapter = config => config.headers.Authorization === 'Bearer fresh'
        ? response(config, { ok: true }) : unauthorized(config);
    const results = await Promise.all([client.api.get('/api/transactions'), client.api.get('/api/budgets')]);
    assert.equal(refreshes, 1);
    assert.ok(results.every(r => r.data.ok));
});

test('failed refresh clears memory and does not loop', async () => {
    const client = createAuthClient();
    let current = 'expired'; let attempts = 0;
    client.subscribe(token => { current = token; });
    client.login('expired', {});
    client.api.defaults.adapter = unauthorized;
    client.auth.defaults.adapter = config => { attempts++; return unauthorized(config); };
    await assert.rejects(client.api.get('/api/transactions'));
    assert.equal(attempts, 1); assert.equal(current, null);
});

test('invalid login never triggers a refresh', async () => {
    const client = createAuthClient(); let refreshes = 0;
    client.api.defaults.adapter = unauthorized;
    client.auth.defaults.adapter = config => { refreshes++; return response(config); };
    await assert.rejects(client.api.post('/api/auth/login', {}));
    assert.equal(refreshes, 0);
});

test('logout waits for rotation and clears state only after server revocation', async () => {
    const client = createAuthClient(); const paths = []; let state;
    client.subscribe(token => { state = token; }); client.login('old', {});
    client.auth.defaults.adapter = async config => {
        paths.push(config.url);
        await new Promise(resolve => setTimeout(resolve, 10));
        return response(config, { token: 'new' });
    };
    const refreshing = client.refresh();
    await client.logout(); await refreshing;
    assert.deepEqual(paths, ['/api/auth/refresh', '/api/auth/logout']);
    assert.equal(state, null);
});

test('logout failure remains visible and preserves session for retry', async () => {
    const client = createAuthClient(); let state;
    client.subscribe(token => { state = token; }); client.login('old', {});
    client.auth.defaults.adapter = () => Promise.reject(new Error('offline'));
    await assert.rejects(client.logout()); assert.equal(state, 'old');
});

test('session display information can be synchronized without changing authentication', async () => {
    const client = createAuthClient(); let state;
    client.subscribe((token, user) => { state = { token, user }; });
    client.login('access', { fullName: 'Original', email: 'user@example.com' });
    client.updateUser({ fullName: 'Updated', email: 'user@example.com' });
    assert.equal(state.token, 'access'); assert.equal(state.user.fullName, 'Updated');
    client.api.defaults.adapter = config => {
        assert.equal(config.headers.Authorization, 'Bearer access');
        return response(config);
    };
    await client.api.get('/api/profile');
});

test('password change refreshes first and clears memory only after server success', async () => {
    const client = createAuthClient(); let state; let notice; const order = [];
    client.subscribe((token, _user, message) => { state = token; notice = message; }); client.login('old', {});
    client.auth.defaults.adapter = config => {
        order.push(config.url); return response(config, { token: 'fresh' });
    };
    client.api.defaults.adapter = config => {
        order.push(config.url);
        assert.equal(config.headers.Authorization, 'Bearer fresh');
        assert.deepEqual(JSON.parse(config.data), { currentPassword: 'old-password', newPassword: 'new-password' });
        return response(config);
    };
    await client.changePassword('old-password', 'new-password');
    assert.deepEqual(order, ['/api/auth/refresh', '/api/auth/password']);
    assert.equal(state, null);
    assert.equal(notice, 'Password updated. Please sign in again.');
});

test('wrong current password preserves session and is not silently retried', async () => {
    const client = createAuthClient(); let state; let refreshes = 0; let writes = 0;
    client.subscribe(token => { state = token; }); client.login('old', {});
    client.auth.defaults.adapter = config => { refreshes++; return response(config, { token: 'fresh' }); };
    client.api.defaults.adapter = config => { writes++; return unauthorized(config); };
    await assert.rejects(client.changePassword('wrong-password', 'new-password'));
    assert.equal(refreshes, 1); assert.equal(writes, 1); assert.equal(state, 'fresh');
});
