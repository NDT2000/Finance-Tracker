import './ui.css';

// One summary figure. tone colours the value: "positive" (emerald), "negative" (red, only for real
// losses such as negative cash flow), "warning" (amber) or "neutral". featured makes it the navy card
// for the most important figure on a page. Colour never carries meaning alone: the label and the
// value's own sign or wording say it too.
export default function StatCard({ label, value, tone = 'neutral', hint, icon: Icon, featured = false }) {
    const classes = ['card', 'stat', `stat--${tone}`, featured && 'stat--featured'].filter(Boolean).join(' ');
    return (
        <div className={classes}>
            <span className="stat__label">
                {Icon && <Icon size={16} aria-hidden="true" />}
                {label}
            </span>
            <span className="stat__value">{value}</span>
            {hint && <p className="stat__hint">{hint}</p>}
        </div>
    );
}
