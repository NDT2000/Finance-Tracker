import { Link, NavLink } from 'react-router-dom';
import { ArrowLeftRight, ChartLine, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Upload, UserRound } from 'lucide-react';
import Logo from './Logo';
import { navigation, homePath } from '../navigation';
import './Sidebar.css';

const icons = { overview: LayoutDashboard, transactions: ArrowLeftRight, planning: ChartLine, imports: Upload, profile: UserRound };

// Navy sidebar with grouped links. collapsed shows icons only (labels stay available to screen
// readers and as tooltips). onToggleCollapsed adds the collapse button (desktop only); onNavigate
// lets the mobile drawer close itself after a link is chosen.
export default function Sidebar({ collapsed = false, onToggleCollapsed, onNavigate }) {
    return (
        <nav className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`} aria-label="Main navigation">
            <Link to={homePath} className="sidebar__brand" onClick={onNavigate}>
                <Logo variant="dark" size={32} compact={collapsed} />
            </Link>

            <div className="sidebar__groups">
                {navigation.map(({ group, items }) => {
                    const labelId = `nav-group-${group.toLowerCase().replace(/\W+/g, '-')}`;
                    return (
                        <div className="sidebar__group" key={group}>
                            <p className="sidebar__group-label" id={labelId}>{group}</p>
                            <ul aria-labelledby={labelId}>
                                {items.map(({ to, label, icon }) => {
                                    const Icon = icons[icon];
                                    return (
                                        <li key={to}>
                                            <NavLink to={to} onClick={onNavigate} title={collapsed ? label : undefined}
                                                className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}>
                                                <Icon size={20} aria-hidden="true" />
                                                <span className="sidebar__label">{label}</span>
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {onToggleCollapsed && (
                <button type="button" className="sidebar__collapse" onClick={onToggleCollapsed}
                    title={collapsed ? 'Expand sidebar' : undefined}>
                    {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
                    <span className="sidebar__label">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                </button>
            )}
        </nav>
    );
}
