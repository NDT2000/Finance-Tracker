import { Link } from 'react-router-dom';
import './AppHeader.css';

export default function Brand({ to = '/dashboard', dark = false }) {
    return <Link to={to} className={`app-brand${dark ? ' app-brand--dark' : ''}`} aria-label="Finance Tracker">
        <span className="app-brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17V12M10 17V9M15 17V6" />
                <path d="m4 8 6-4 5 1 5-3M17 2h3v3M4 21h16" />
            </svg>
        </span>
        <span className="app-brand__text">
            <span className="app-brand__title">Finance Tracker</span>
            <span className="app-brand__subtitle">YOUR MONEY, IN PERSPECTIVE</span>
        </span>
    </Link>;
}
