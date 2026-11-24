import { LogoMark } from '../../components/Logo';
import '../../components/ui/ui.css';
import './Auth.css';

// Centred card shared by Sign in and Create account. footer holds the link to the other page.
export default function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <main className="auth">
            <div className="auth__card">
                <div className="auth__logo"><LogoMark size={48} /></div>
                <h1 className="auth__title">{title}</h1>
                <p className="auth__subtitle">{subtitle}</p>
                {children}
                <p className="auth__footer">{footer}</p>
            </div>
        </main>
    );
}
