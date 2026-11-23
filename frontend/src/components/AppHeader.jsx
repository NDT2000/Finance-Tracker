import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Logo from './Logo';
import UserMenu from './UserMenu';
import { findPage, homePath } from '../navigation';
import './AppHeader.css';

// 64px header above every signed-in page: the drawer button and logo (phones only), where you are
// in the navigation, and the account menu. toggleRef points at the drawer button so focus can return to it.
export default function AppHeader({ onOpenNavigation, navigationOpen, logoutDisabled, toggleRef }) {
    const page = findPage(useLocation().pathname);
    return (
        <header className="app-header">
            <button type="button" ref={toggleRef} className="app-header__nav-toggle" onClick={onOpenNavigation}
                aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="mobile-navigation">
                <Menu size={22} aria-hidden="true" />
            </button>
            <Link to={homePath} className="app-header__mobile-logo">
                <Logo variant="light" size={30} compact />
            </Link>
            {page && (
                <p className="app-header__context">
                    <span className="app-header__group">{page.group}</span>
                    <span aria-hidden="true" className="app-header__separator">/</span>
                    <span className="app-header__page">{page.item.label}</span>
                </p>
            )}
            <div className="app-header__account">
                <UserMenu logoutDisabled={logoutDisabled} />
            </div>
        </header>
    );
}
