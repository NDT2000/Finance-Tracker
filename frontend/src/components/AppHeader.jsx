import { NavLink } from 'react-router-dom';
import Brand from './Brand';

const destinations = [
    ['/dashboard', 'Dashboard'],
    ['/planning', 'Financial planning'],
    ['/imports', 'Batch imports'],
    ['/profile', 'My profile'],
];

export default function AppHeader({ children }) {
    return <header className="app-header">
        <div className="app-header__inner">
            <Brand />
            <nav className="app-header__nav" aria-label="Main navigation">
                {destinations.map(([to, label]) => <NavLink key={to} to={to}
                    className={({ isActive }) => `app-header__link${isActive ? ' app-header__link--active' : ''}`}>
                    {label}
                </NavLink>)}
            </nav>
            {children && <div className="app-header__account">{children}</div>}
        </div>
    </header>;
}
