import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

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
            const response = await api.post('/api/auth/register', {
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
            <div style={styles.blob1} />
            <div style={styles.blob2} />

            <div style={styles.card}>
                <div style={styles.logoWrap}>
                    <div style={styles.logo}>₹</div>
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
                    {field('password', 'Password', 'password', '•••••••• (min 6)', password, setPassword)}

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

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f1a',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
    },
    blob1: {
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        top: '-150px',
        right: '-100px',
        pointerEvents: 'none',
    },
    blob2: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        bottom: '-100px',
        left: '-100px',
        pointerEvents: 'none',
    },
    card: {
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        animation: 'fadeUp 0.5s ease forwards',
    },
    logoWrap: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem',
    },
    logo: {
        width: '52px',
        height: '52px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        color: 'white',
        fontWeight: '700',
        boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
    },
    title: {
        textAlign: 'center',
        color: '#ffffff',
        fontSize: '1.6rem',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        marginBottom: '0.4rem',
        fontFamily: "'DM Sans', sans-serif",
    },
    subtitle: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.9rem',
        marginBottom: '1.75rem',
    },
    errorBox: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        color: '#fca5a5',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    fieldWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.8rem',
        fontWeight: '500',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
    },
    input: {
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        fontSize: '0.95rem',
        color: '#ffffff',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        fontFamily: "'Inter', sans-serif",
    },
    inputFocused: {
        borderColor: '#6366f1',
        boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
        backgroundColor: 'rgba(99,102,241,0.05)',
    },
    button: {
        marginTop: '0.5rem',
        padding: '0.85rem',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        letterSpacing: '0.01em',
        boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
        fontFamily: "'Inter', sans-serif",
    },
    buttonLoading: {
        opacity: 0.7,
        cursor: 'not-allowed',
    },
    footer: {
        textAlign: 'center',
        marginTop: '1.5rem',
        color: 'rgba(255,255,255,0.35)',
        fontSize: '0.875rem',
    },
    link: {
        color: '#818cf8',
        textDecoration: 'none',
        fontWeight: '500',
    },
};