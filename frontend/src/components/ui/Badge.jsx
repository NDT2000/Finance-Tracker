import './ui.css';

// Small status label in a semantic colour pair: success, danger, warning, info, ai or pending.
// The text itself must say the status; the colour only reinforces it.
export default function Badge({ tone = 'pending', icon: Icon, children }) {
    return (
        <span className={`badge badge--${tone}`}>
            {Icon && <Icon size={12} aria-hidden="true" />}
            {children}
        </span>
    );
}
