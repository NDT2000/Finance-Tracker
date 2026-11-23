import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import './AppLayout.css';

const COLLAPSED_KEY = 'finance-tracker.sidebar-collapsed';
const DESKTOP_QUERY = '(min-width: 900px)';

// Browser storage can be unavailable (private mode, blocked site data), so failures are ignored.
function readCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
}
function saveCollapsed(value) {
    try { localStorage.setItem(COLLAPSED_KEY, String(value)); } catch { /* keep the in-memory value */ }
}

// Elements that can receive keyboard focus inside the drawer
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shell around every signed-in page: navy sidebar (desktop), drawer (phones), header and the page itself.
export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [logoutBlocked, setLogoutBlocked] = useState(false);
    const { pathname } = useLocation();
    const toggleRef = useRef(null);
    const drawerRef = useRef(null);
    const closeRef = useRef(null);

    function toggleCollapsed() {
        setCollapsed((value) => {
            saveCollapsed(!value);
            return !value;
        });
    }

    function closeDrawer() {
        setDrawerOpen(false);
        toggleRef.current?.focus();
    }

    // A new page closes the drawer (link chosen, or browser back/forward)
    useEffect(() => { setDrawerOpen(false); }, [pathname]);

    // While the drawer is open: focus its close button, stop the page behind from scrolling,
    // and close it if the window grows to desktop width.
    useEffect(() => {
        if (!drawerOpen) return;
        closeRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const desktop = window.matchMedia(DESKTOP_QUERY);
        const onResize = () => { if (desktop.matches) setDrawerOpen(false); };
        desktop.addEventListener('change', onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            desktop.removeEventListener('change', onResize);
        };
    }, [drawerOpen]);

    // Escape closes the drawer; Tab and Shift+Tab stay inside it
    function onDrawerKeyDown(event) {
        if (event.key === 'Escape') {
            closeDrawer();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...drawerRef.current.querySelectorAll(FOCUSABLE)];
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    return (
        <div className={`app-shell${collapsed ? ' app-shell--collapsed' : ''}`}>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            <div className="app-shell__sidebar">
                <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
            </div>

            {drawerOpen && (
                <div className="drawer">
                    <div className="drawer__backdrop" onClick={closeDrawer} aria-hidden="true" />
                    <div className="drawer__panel" id="mobile-navigation" role="dialog" aria-modal="true"
                        aria-label="Navigation" ref={drawerRef} onKeyDown={onDrawerKeyDown}>
                        <button type="button" className="drawer__close" ref={closeRef} onClick={closeDrawer} aria-label="Close navigation">
                            <X size={22} aria-hidden="true" />
                        </button>
                        <Sidebar onNavigate={() => setDrawerOpen(false)} />
                    </div>
                </div>
            )}

            <div className="app-shell__main">
                <AppHeader toggleRef={toggleRef} navigationOpen={drawerOpen}
                    onOpenNavigation={() => setDrawerOpen(true)} logoutDisabled={logoutBlocked} />
                <div id="main-content" className="app-shell__content" tabIndex={-1}>
                    <Outlet context={{ setLogoutBlocked }} />
                </div>
            </div>
        </div>
    );
}
