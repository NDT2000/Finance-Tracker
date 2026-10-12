import { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '../api/axios';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Remove legacy persistent credentials; new access tokens stay in memory.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const unsubscribe = authClient.subscribe((value, info) => { setToken(value); setUser(info); });
        authClient.refresh().catch(() => {}).finally(() => setLoading(false));
        return unsubscribe;
    }, []);
    return <AuthContext.Provider value={{ token, user, loading,
        login: authClient.login, logout: authClient.logout }}>{loading ? <p>Loading session…</p> : children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
