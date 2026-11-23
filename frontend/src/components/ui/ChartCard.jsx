import { useId } from 'react';
import './ui.css';

// A card holding one chart. summary is a sentence describing what the chart shows, read by screen
// readers in place of the drawing (e.g. "Food is the largest category at $335.95 of $2,009.39").
// action is an optional control in the corner, such as a filter or a link.
export default function ChartCard({ title, description, summary, action, children }) {
    const titleId = useId();
    return (
        <section className="card" aria-labelledby={titleId}>
            <div className="card__header">
                <div>
                    <h2 className="card__title" id={titleId}>{title}</h2>
                    {description && <p className="card__description">{description}</p>}
                </div>
                {action}
            </div>
            <figure className="chart-card__figure">
                <div aria-hidden={summary ? 'true' : undefined}>{children}</div>
                {summary && <figcaption className="sr-only">{summary}</figcaption>}
            </figure>
        </section>
    );
}
