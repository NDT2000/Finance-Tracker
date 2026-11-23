import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';
import UserMenu from './UserMenu';
import './AppHeader.css';

// My profile and Logout live in the account menu, so they are not repeated here.
const destinations = [
    ['/dashboard', 'Dashboard'],
    ['/planning', 'Financial planning'],
    ['/imports', 'Batch imports'],
];

// Shared top bar for signed-in pages. Pass children to replace the default account menu
// (the profile page does, so its Logout can be disabled while a password change is saving).
export default function AppHeader({ children }) {
    return (
        <header className="app-header">
            <div className="app-header__inner">
                <Link to="/dashboard" className="app-header__brand">
                    <Logo variant="dark" size={34} />
                </Link>
                <nav className="app-header__nav" aria-label="Main navigation">
                    {destinations.map(([to, label]) => (
                        <NavLink key={to} to={to}
                            className={({ isActive }) => `app-header__link${isActive ? ' app-header__link--active' : ''}`}>
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="app-header__account">{children ?? <UserMenu />}</div>
            </div>
        </header>
    );
}
