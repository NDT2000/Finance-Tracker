import { Link } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, ChartLine, Target, TrendingUp, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../useTheme';
import Logo from '../components/Logo';
import { homePath } from '../navigation';
import { closing, features, hero } from './landing/landingContent';
import '../components/ui/ui.css';
import './landing/Landing.css';

const ICONS = { tracking: ArrowLeftRight, budgets: Target, forecasts: TrendingUp, imports: Upload, planning: ChartLine };

// Public landing page at "/". Signed-in visitors get a link into the app instead of sign-in buttons.
export default function Landing() {
    const { token } = useAuth();
    const [theme] = useTheme();
    // onDark: the hero uses an outline Sign in button; on the light closing section it is a secondary button
    const actions = onDark => token
        ? <Link to={homePath} className="btn btn--primary landing__cta">Open app <ArrowRight size={16} aria-hidden="true" /></Link>
        : <>
            <Link to="/register" className="btn btn--primary landing__cta">Create account <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/login" className={onDark ? "btn landing__btn-outline" : "btn btn--secondary landing__cta"}>Sign in</Link>
        </>;

    return (
        <div className="landing">
            <header className="landing__hero">
                <nav className="landing__nav" aria-label="Main">
                    <Link to="/" className="landing__brand" aria-label="Finance Tracker home"><Logo variant="dark" size={32} /></Link>
                    <div className="landing__nav-links">
                        <a href="#features">Features</a>
                        {token
                            ? <Link to={homePath} className="btn btn--primary">Open app</Link>
                            : <>
                                <Link to="/login">Sign in</Link>
                                <Link to="/register" className="btn btn--primary landing__nav-signup">Create account</Link>
                            </>}
                    </div>
                </nav>

                <div className="landing__hero-copy">
                    <h1 className="landing__title">{hero.title}</h1>
                    <p className="landing__lead">{hero.text}</p>
                    <div className="landing__actions">{actions(true)}</div>
                </div>

                <figure className="landing__frame landing__frame--hero">
                    <img {...hero.image} fetchPriority="high" decoding="async" />
                </figure>
            </header>

            <main>
                <section id="features" className="landing__section" aria-labelledby="features-title">
                    <h2 className="landing__heading" id="features-title">Everything in one place</h2>
                    <ul className="landing__grid">
                        {features.map(({ id, title, text }) => {
                            const Icon = ICONS[id];
                            return (
                                <li key={id} className="landing__card">
                                    <span className="landing__icon"><Icon size={20} aria-hidden="true" /></span>
                                    <h3>{title}</h3>
                                    <p>{text}</p>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {features.filter(f => f.image).map(({ id, title, text, image }, i) => (
                    <section key={id} className={`landing__showcase${i % 2 ? ' landing__showcase--flip' : ''}`} aria-labelledby={`showcase-${id}`}>
                        <div className="landing__showcase-copy">
                            <h2 className="landing__heading" id={`showcase-${id}`}>{title}</h2>
                            <p>{text}</p>
                        </div>
                        <figure className="landing__frame">
                            <img {...image} loading="lazy" decoding="async" />
                        </figure>
                    </section>
                ))}

                <section className="landing__closing" aria-labelledby="closing-title">
                    <h2 className="landing__heading" id="closing-title">{closing.title}</h2>
                    <p>{closing.text}</p>
                    <div className="landing__actions">{actions(false)}</div>
                </section>
            </main>

            <footer className="landing__footer">
                <Logo variant={theme === 'dark' ? 'dark' : 'light'} size={24} />
                <p>Screens show sample data.</p>
            </footer>
        </div>
    );
}
