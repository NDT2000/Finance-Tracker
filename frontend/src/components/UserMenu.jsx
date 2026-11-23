import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Up to two initials from the user's name, e.g. "Nayan Taori" -> "NT".
function initialsOf(fullName) {
    return (fullName || '').trim().split(/\s+/).filter(Boolean)
        .map(word => Array.from(word)[0]).slice(0, 2).join('').toUpperCase();
}

// Account menu in the header: the user's initials open a list with My profile and Logout.
// logoutDisabled keeps Logout unavailable while the profile page is saving a new password.
export default function UserMenu({ logoutDisabled = false }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState('');
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const initials = initialsOf(user?.fullName);

    // While open, close on a click outside the menu or on Escape
    useEffect(() => {
        if (!open) return;
        const onClick = (event) => {
            if (!menuRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    async function signOut() {
        setLoggingOut(true);
        setError('');
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch {
            setError('Logout failed. Please try again.');
            setLoggingOut(false);
        }
    }

    return (
        <div className="user-menu" ref={menuRef}>
            <button
                type="button"
                ref={buttonRef}
                className="user-menu-button"
                aria-label="Account menu"
                aria-expanded={open}
                aria-controls="user-menu-list"
                onClick={() => setOpen((value) => !value)}
            >
                {initials || <UserRound size={18} aria-hidden="true" />}
            </button>
            {open && (
                <div id="user-menu-list" className="user-menu-list">
                    {user?.fullName && <p className="user-menu-name">{user.fullName}</p>}
                    <Link to="/profile" onClick={() => setOpen(false)}>
                        <UserRound size={16} aria-hidden="true" /> My profile
                    </Link>
                    <button type="button" onClick={signOut} disabled={loggingOut || logoutDisabled}>
                        <LogOut size={16} aria-hidden="true" /> {loggingOut ? 'Signing out…' : 'Logout'}
                    </button>
                    {logoutDisabled && <p className="user-menu-note">Logout is available once your password change finishes.</p>}
                    {error && <p className="user-menu-error" role="alert">{error}</p>}
                </div>
            )}
        </div>
    );
}
