import { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '../api/axios';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Remove legacy persistent credentials; new access tokens stay in memory.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const unsubscribe = authClient.subscribe((value, info, message) => { setToken(value); setUser(info); setNotice(message); });
        authClient.refresh().catch(() => {}).finally(() => setLoading(false));
        return unsubscribe;
    }, []);
    return <AuthContext.Provider value={{ token, user, loading, notice,
        login: authClient.login, logout: authClient.logout,
        updateUser: authClient.updateUser, changePassword: authClient.changePassword }}>{loading ? <p>Loading session…</p> : children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
