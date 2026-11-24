import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../api/axios';
import { homePath } from '../navigation';
import { registerErrors } from '../passwordRules';
import AuthLayout from './auth/AuthLayout';

const FIELDS = [
    { key: 'fullName', label: 'Full name', type: 'text', autoComplete: 'name', maxLength: 100 },
    { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254, placeholder: 'you@example.com' },
    { key: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', maxLength: 72, hint: 'At least 15 characters' },
];

export default function Register() {
    const [form, setForm] = useState({ fullName: '', email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function submit(event) {
        event.preventDefault();
        setError('');
        const next = registerErrors(form);
        setErrors(next);
        if (Object.keys(next).length) return;
        setLoading(true);
        try {
            const { data } = await authClient.authenticate('/api/auth/register', { ...form, fullName: form.fullName.trim(), email: form.email.trim() });
            login(data.token, { email: data.email, fullName: data.fullName });
            navigate(homePath);
        } catch (err) {
            setError(err.response?.data?.message || 'Your account could not be created. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title="Create account" subtitle="Start tracking your finances"
            footer={<>Already have an account? <Link to="/login">Sign in</Link></>}>
            <form className="auth__form" onSubmit={submit} noValidate>
                {FIELDS.map(({ key, label, hint, ...input }) => {
                    const id = `register-${key}`;
                    const describedBy = errors[key] ? `${id}-error` : hint ? `${id}-hint` : undefined;
                    return (
                        <div className="field" key={key}>
                            <label htmlFor={id}>{label}</label>
                            <input id={id} {...input} value={form[key]} disabled={loading}
                                aria-invalid={Boolean(errors[key])} aria-describedby={describedBy}
                                onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(x => ({ ...x, [key]: '' })); }} />
                            {errors[key]
                                ? <p className="field__error" id={`${id}-error`}>{errors[key]}</p>
                                : hint && <p className="field__hint" id={`${id}-hint`}>{hint}</p>}
                        </div>
                    );
                })}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="btn btn--primary auth__submit" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create account'}
                </button>
            </form>
        </AuthLayout>
    );
}
