import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Header menu shared by the app pages: a link to the profile and logout.
export default function UserMenu() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState('');
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

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
                {/* Three horizontal lines */}
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
            {open && (
                <div id="user-menu-list" className="user-menu-list">
                    <Link to="/profile" onClick={() => setOpen(false)}>My profile</Link>
                    <button type="button" onClick={signOut} disabled={loggingOut}>
                        {loggingOut ? 'Signing out…' : 'Logout'}
                    </button>
                    {error && <p role="alert">{error}</p>}
                </div>
            )}
        </div>
    );
}
