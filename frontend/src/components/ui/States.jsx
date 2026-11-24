import { Inbox, TriangleAlert } from 'lucide-react';
import './ui.css';

// Nothing to show yet, e.g. no transactions this month. action is an optional button or link.
export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
    return (
        <div className="state">
            <span className="state__icon"><Icon size={22} aria-hidden="true" /></span>
            <p className="state__title">{title}</p>
            {message && <p className="state__message">{message}</p>}
            {action}
        </div>
    );
}

// Something failed to load. Announced to screen readers; onRetry adds a "Try again" button.
export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
    return (
        <div className="state state--error" role="alert">
            <span className="state__icon"><TriangleAlert size={22} aria-hidden="true" /></span>
            <p className="state__title">{title}</p>
            {message && <p className="state__message">{message}</p>}
            {onRetry && <button type="button" className="btn btn--secondary" onClick={onRetry}>Try again</button>}
        </div>
    );
}

// Grey placeholder shapes while content loads. variant: "text" (lines), "stat" (a figure) or "chart".
// Screen readers hear the label instead of the shapes. When several skeletons load together, give one
// the label and the others label="" so the announcement is made only once.
export function LoadingSkeleton({ variant = 'text', lines = 3, label = 'Loading…' }) {
    return (
        <div className="skeleton" role={label ? 'status' : undefined}>
            {label && <span className="sr-only">{label}</span>}
            {variant === 'stat' && <>
                <div className="skeleton__block skeleton__line" style={{ width: '40%' }} aria-hidden="true" />
                <div className="skeleton__block skeleton__value" aria-hidden="true" />
            </>}
            {variant === 'chart' && <div className="skeleton__block skeleton__chart" aria-hidden="true" />}
            {variant === 'text' && Array.from({ length: lines }, (_, i) =>
                <div key={i} className="skeleton__block skeleton__line" aria-hidden="true" />)}
        </div>
    );
}
