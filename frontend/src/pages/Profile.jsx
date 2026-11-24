import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { ErrorState, LoadingSkeleton } from '../components/ui/States';
import { passwordChangeErrors } from '../passwordRules';
import './profile/Profile.css';

const EMPTY = { current: '', next: '', confirm: '' };

// Read-only personal details and password change. A successful change revokes every session,
// so the user is sent to sign in again.
export default function Profile() {
    const { changePassword } = useAuth();
    const { setLogoutBlocked } = useOutletContext();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    async function load() {
        try {
            const { data } = await api.get('/api/profile');
            setProfile(data);
            setLoadError('');
        } catch {
            setLoadError('Your profile could not be loaded.');
        }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the API; state is set only after the request resolves
    useEffect(() => { load(); }, []);

    // Logout (in the account menu) waits until a password change has finished saving
    useEffect(() => {
        setLogoutBlocked(saving);
        return () => setLogoutBlocked(false);
    }, [saving, setLogoutBlocked]);

    const set = (key, value) => {
        setForm(f => ({ ...f, [key]: value }));
        setErrors(e => ({ ...e, [key]: '' }));
    };

    async function submit(event) {
        event.preventDefault();
        if (saving) return;
        setSaveError('');
        const next = passwordChangeErrors(form);
        setErrors(next);
        if (Object.keys(next).length) return;
        setSaving(true);
        try {
            await changePassword(form.current, form.next);
            setForm(EMPTY);
            navigate('/login', { replace: true });
        } catch (error) {
            setForm(f => ({ ...f, current: '' }));
            setSaveError(error.response?.status === 401
                ? 'Your current password is incorrect.'
                : error.response?.data?.message || 'Your password could not be changed. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    const fieldProps = key => ({
        value: form[key], disabled: saving, maxLength: key === 'current' ? 256 : 72,
        'aria-invalid': Boolean(errors[key]),
        'aria-describedby': errors[key] ? `password-${key}-error` : key === 'next' ? 'password-next-hint' : undefined,
        onChange: e => set(key, e.target.value),
    });
    const fieldError = key => errors[key] && <p className="field__error" id={`password-${key}-error`}>{errors[key]}</p>;

    return (
        <div className="page">
            <div className="page__head">
                <div>
                    <h1 className="page__title">My Profile</h1>
                    <p className="page__subtitle">Personal details and password</p>
                </div>
            </div>

            {loadError && !profile && <div className="card"><ErrorState message={loadError} onRetry={load} /></div>}
            {!loadError && !profile && <div className="card"><LoadingSkeleton lines={3} label="Loading your profile…" /></div>}

            {profile && (
                <div className="profile-grid">
                    <section className="card" aria-labelledby="details-title">
                        <div className="card__header">
                            <h2 className="card__title profile-title" id="details-title"><UserRound size={18} aria-hidden="true" /> Personal details</h2>
                        </div>
                        <dl className="profile-details">
                            <dt>Full name</dt><dd>{profile.fullName}</dd>
                            <dt>Email</dt><dd>{profile.email}</dd>
                        </dl>
                    </section>

                    <section className="card" aria-labelledby="password-title">
                        <div className="card__header">
                            <div>
                                <h2 className="card__title profile-title" id="password-title"><KeyRound size={18} aria-hidden="true" /> Change password</h2>
                                <p className="card__description">You will be signed out on every device.</p>
                            </div>
                        </div>
                        <form className="profile-password" onSubmit={submit} noValidate>
                            <div className="field">
                                <label htmlFor="password-current">Current password</label>
                                <input id="password-current" type="password" autoComplete="current-password" {...fieldProps('current')} />
                                {fieldError('current')}
                            </div>
                            <div className="field">
                                <label htmlFor="password-next">New password</label>
                                <input id="password-next" type="password" autoComplete="new-password" {...fieldProps('next')} />
                                {fieldError('next') || <p className="field__hint" id="password-next-hint">At least 15 characters</p>}
                            </div>
                            <div className="field">
                                <label htmlFor="password-confirm">Confirm new password</label>
                                <input id="password-confirm" type="password" autoComplete="new-password" {...fieldProps('confirm')} />
                                {fieldError('confirm')}
                            </div>
                            {saveError && <p className="form-error" role="alert">{saveError}</p>}
                            <div className="form-actions">
                                <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
