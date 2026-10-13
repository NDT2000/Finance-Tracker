import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Profile.css';
import BankAccounts from './BankAccounts';

export default function Profile() {
    const { user, changePassword, logout } = useAuth();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [section, setSection] = useState('personal');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [logoutError, setLogoutError] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let active = true;
        api.get('/api/profile').then(({ data }) => {
            if (active) { setFullName(data.fullName); setEmail(data.email); }
        }).catch(() => {
            if (active) setLoadError('Your profile could not be loaded. Please reload the page to try again.');
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const busy = changingPassword || loggingOut;
    const initials = (user?.fullName || 'User').trim().split(/\s+/)
        .filter(Boolean).map(word => Array.from(word)[0]).slice(0, 2).join('').toUpperCase();

    async function savePassword(event) {
        event.preventDefault();
        if (busy) return;
        setPasswordError('');
        if (newPassword !== confirmation) { setPasswordError('The new passwords do not match.'); return; }
        if ([...newPassword].length < 15 || new TextEncoder().encode(newPassword).length > 72) {
            setPasswordError('Use at least 15 characters and at most 72 UTF-8 bytes.'); return;
        }
        setChangingPassword(true);
        try {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword(''); setNewPassword(''); setConfirmation('');
            navigate('/login', { replace: true });
        } catch (error) {
            setCurrentPassword('');
            setPasswordError(error.response?.status === 401
                ? 'Your current password could not be verified. Please try again.'
                : error.response?.data?.message || 'Your password could not be changed. Please try again.');
        } finally { setChangingPassword(false); }
    }

    async function signOut() {
        if (busy) return;
        setLogoutError(''); setLoggingOut(true);
        try { await logout(); navigate('/login', { replace: true }); }
        catch { setLogoutError('Logout failed. Please try again.'); }
        finally { setLoggingOut(false); }
    }

    return (
        <div className="profile-page">
            <header className="profile-header">
                <Link to="/dashboard" className="profile-brand">Finance Tracker</Link>
                <nav aria-label="Account navigation">
                    <Link to="/dashboard">Dashboard</Link>
                    <button type="button" onClick={signOut} disabled={busy}>{loggingOut ? 'Signing out…' : 'Logout'}</button>
                </nav>
            </header>
            <main className="profile-content">
                <div className="profile-heading">
                    <div className="profile-avatar" aria-hidden="true">{initials}</div>
                    <div><p className="profile-eyebrow">YOUR ACCOUNT</p><h1>My profile</h1>
                        <p>View your personal details, change your password and manage bank accounts.</p></div>
                </div>
                {logoutError && <p className="profile-error" role="alert">{logoutError}</p>}
                {loading ? <p role="status">Loading your profile…</p> : loadError ? (
                    <p className="profile-error" role="alert">{loadError}</p>
                ) : (
                    <div className="profile-layout">
                        <nav className="profile-menu" aria-label="Profile menu">
                            <button type="button" aria-pressed={section === 'personal'} disabled={busy} onClick={() => setSection('personal')}>Personal details</button>
                            <button type="button" aria-pressed={section === 'banks'} disabled={busy} onClick={() => {
                                setSection('banks'); setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setPasswordError('');
                            }}>Bank accounts</button>
                        </nav>
                        {section === 'banks' ? <BankAccounts/> : <div className="profile-grid" id="profile-personal-panel">
                        <section className="profile-card" aria-labelledby="details-title">
                            <h2 id="details-title">Personal details</h2>
                            <div className="profile-details">
                                <label htmlFor="profile-name">Full name</label>
                                <input id="profile-name" autoComplete="name" value={fullName} readOnly aria-describedby="name-help"/>
                                <p id="name-help" className="profile-help">Your full name cannot be changed.</p>
                                <label htmlFor="profile-email">Email address</label>
                                <input id="profile-email" type="email" autoComplete="email" value={email} readOnly aria-describedby="email-help"/>
                                <p id="email-help" className="profile-help">Your sign-in email is read-only.</p>
                            </div>
                        </section>
                        <section className="profile-card" aria-labelledby="password-title">
                            <h2 id="password-title">Change password</h2>
                            <p>Changing your password signs you out on every device.</p>
                            <form onSubmit={savePassword}>
                                <label htmlFor="current-password">Current password</label>
                                <input id="current-password" type="password" autoComplete="current-password" required maxLength={256}
                                    value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={busy} />
                                <label htmlFor="new-password">New password</label>
                                <input id="new-password" type="password" autoComplete="new-password" required maxLength={72}
                                    aria-describedby="password-help" value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={busy} />
                                <p id="password-help" className="profile-help">At least 15 characters, up to 72 UTF-8 bytes. Avoid common passwords.</p>
                                <label htmlFor="confirm-password">Confirm new password</label>
                                <input id="confirm-password" type="password" autoComplete="new-password" required maxLength={72}
                                    value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} />
                                {passwordError && <p className="profile-error" role="alert">{passwordError}</p>}
                                <button className="profile-primary" type="submit" disabled={busy}>{changingPassword ? 'Updating…' : 'Update password'}</button>
                            </form>
                        </section>
                        </div>}
                    </div>
                )}
            </main>
        </div>
    );
}
