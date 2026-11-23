import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../api/axios';
import { styles } from './authStyles';
import { LogoMark } from '../components/Logo';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState('');
    const { login, notice } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await authClient.authenticate('/api/auth/login', {
                email,
                password
            });
            login(response.data.token, {
                email: response.data.email,
                fullName: response.data.fullName,
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.status === 429 ? 'Too many attempts. Try again in a minute.' : 'Unable to sign in. Check your credentials or try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Logo mark */}
                <div style={styles.logoWrap}>
                    <LogoMark size={52} />
                </div>

                <h1 style={styles.title}>Welcome back</h1>
                <p style={styles.subtitle}>Sign in to your Finance Tracker</p>

                {notice && (
                    <p role="status" style={styles.notice}>
                        {notice}
                    </p>
                )}
                {error && (
                    <div style={styles.errorBox}>
                        <span>⚠</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.fieldWrap}>
                        <label style={styles.label}>Email</label>
                        <input
                            style={{
                                ...styles.input,
                                ...(focused === 'email' ? styles.inputFocused : {})
                            }}
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused('')}
                            required
                        />
                    </div>

                    <div style={styles.fieldWrap}>
                        <label style={styles.label}>Password</label>
                        <input
                            style={{
                                ...styles.input,
                                ...(focused === 'password' ? styles.inputFocused : {})
                            }}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onFocus={() => setFocused('password')}
                            onBlur={() => setFocused('')}
                            required
                        />
                    </div>

                    <button
                        className="auth-btn"
                        style={{
                            ...styles.button,
                            ...(loading ? styles.buttonLoading : {})
                        }}
                        type="submit"
                        disabled={loading}>
                        {loading ? (
                            <span style={styles.spinner}>⟳ Signing in...</span>
                        ) : (
                            'Sign in →'
                        )}
                    </button>
                </form>

                <p style={styles.footer}>
                    Don't have an account?{' '}
                    <Link to="/register" style={styles.link}>
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
