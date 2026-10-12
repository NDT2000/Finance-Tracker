import axios from 'axios';

export function createAuthClient(baseURL = '') {
    const api = axios.create({ baseURL, withCredentials: true });
    const auth = axios.create({ baseURL, withCredentials: true,
        headers: { 'X-Requested-With': 'FinanceTracker' } });
    let accessToken = null;
    let refreshPromise = null;
    let generation = 0;
    let onSession = () => {};
    function setSession(token, user, notice = null) {
        accessToken = token;
        onSession(token, user, notice);
    }
    async function refresh() {
        if (!refreshPromise) {
            const currentGeneration = generation;
            const rotate = () => auth.post('/api/auth/refresh');
            const rotation = globalThis.navigator?.locks
                ? navigator.locks.request('finance-session', rotate) : rotate();
            refreshPromise = rotation.then(({ data }) => {
                if (generation === currentGeneration) {
                    setSession(data.token, { email: data.email, fullName: data.fullName });
                }
                return accessToken;
            }).catch(error => {
                if (generation === currentGeneration) setSession(null, null);
                throw error;
            }).finally(() => { refreshPromise = null; });
        }
        return refreshPromise;
    }
    api.interceptors.request.use(config => {
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
        config.headers['X-Requested-With'] = 'FinanceTracker';
        return config;
    });
    api.interceptors.response.use(response => response, async error => {
        const request = error.config;
        if (error.response?.status !== 401 || !request || request._retried || request.url.startsWith('/api/auth/')) {
            throw error;
        }
        request._retried = true;
        // A concurrent request may already have refreshed the token.
        if (request.headers.Authorization !== `Bearer ${accessToken}` && accessToken) {
            request.headers.Authorization = `Bearer ${accessToken}`;
            return api(request);
        }
        await refresh();
        if (!accessToken) throw error;
        request.headers.Authorization = `Bearer ${accessToken}`;
        return api(request);
    });
    return { api, auth, refresh,
        subscribe(callback) { onSession = callback; return () => { onSession = () => {}; }; },
        async authenticate(path, data) {
            if (refreshPromise) await refreshPromise.catch(() => {});
            const signIn = () => auth.post(path, data);
            return globalThis.navigator?.locks
                ? navigator.locks.request('finance-session', signIn) : signIn();
        },
        login(token, user) { generation++; setSession(token, user); },
        updateUser(user) {
            if (accessToken) { generation++; setSession(accessToken, user); }
        },
        async changePassword(currentPassword, newPassword) {
            // Refresh first: this endpoint's 401 can mean a wrong current password,
            // so its failures must not trigger generic API refresh/retry behavior.
            await refresh();
            await api.post('/api/auth/password', { currentPassword, newPassword });
            generation++;
            setSession(null, null, 'Password updated. Please sign in again.'); // All server sessions are revoked.
        },
        async logout() {
            generation++;
            // Await any rotation so logout revokes the current cookie/session.
            if (refreshPromise) await refreshPromise.catch(() => {});
            const revoke = () => auth.post('/api/auth/logout');
            if (globalThis.navigator?.locks) await navigator.locks.request('finance-session', revoke);
            else await revoke();
            setSession(null, null);
        },
    };
}

const client = createAuthClient(import.meta.env?.VITE_API_BASE_URL || '');
export const authClient = client;
export default client.api;
