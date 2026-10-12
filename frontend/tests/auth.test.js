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
