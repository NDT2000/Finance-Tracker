import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../api/axios';
import { styles } from './authStyles';
import { LogoMark } from '../components/Logo';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await authClient.authenticate('/api/auth/register', {
                fullName, email, password,
            });
            login(response.data.token, {
                email: response.data.email,
                fullName: response.data.fullName,
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const field = (id, label, type, placeholder, value, setter) => (
        <div style={styles.fieldWrap} key={id}>
            <label style={styles.label}>{label}</label>
            <input
                style={{
                    ...styles.input,
                    ...(focused === id ? styles.inputFocused : {})
                }}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => setter(e.target.value)}
                onFocus={() => setFocused(id)}
                onBlur={() => setFocused('')}
                required
            />
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.logoWrap}>
                    <LogoMark size={52} />
                </div>

                <h1 style={styles.title}>Create account</h1>
                <p style={styles.subtitle}>Start tracking your finances today</p>

                {error && (
                    <div style={styles.errorBox}>
                        <span>⚠</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    {field('name', 'Full name', 'text', 'Nayan Taori', fullName, setFullName)}
                    {field('email', 'Email', 'email', 'you@example.com', email, setEmail)}
                    {field('password', 'Password', 'password', '•••••••• (min 15)', password, setPassword)}

                    <button
                        className="auth-btn"
                        style={{
                            ...styles.button,
                            ...(loading ? styles.buttonLoading : {})
                        }}
                        type="submit"
                        disabled={loading}>
                        {loading ? 'Creating account...' : 'Create account →'}
                    </button>
                </form>

                <p style={styles.footer}>
                    Already have an account?{' '}
                    <Link to="/login" style={styles.link}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
