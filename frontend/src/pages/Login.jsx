import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../api/axios';
import { homePath } from '../navigation';
import AuthLayout from './auth/AuthLayout';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, notice } = useAuth();
    const navigate = useNavigate();

    async function submit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await authClient.authenticate('/api/auth/login', { email, password });
            login(data.token, { email: data.email, fullName: data.fullName });
            navigate(homePath);
        } catch (err) {
            setError(err.response?.status === 429
                ? 'Too many attempts. Try again in a minute.'
                : 'Unable to sign in. Check your email and password, or try again later.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to Finance Tracker"
            footer={<>Don&apos;t have an account? <Link to="/register">Create one</Link></>}>
            {notice && <p className="auth__notice" role="status">{notice}</p>}
            <form className="auth__form" onSubmit={submit}>
                <div className="field">
                    <label htmlFor="login-email">Email</label>
                    <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" required
                        value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="field">
                    <label htmlFor="login-password">Password</label>
                    <input id="login-password" type="password" autoComplete="current-password" required
                        value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </AuthLayout>
    );
}
