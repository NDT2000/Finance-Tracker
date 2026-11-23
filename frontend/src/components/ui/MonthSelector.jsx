import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonth, shiftMonth } from '../../format';
import './ui.css';

// Month picker ("YYYY-MM") with previous/next buttons for quick stepping.
// An emptied input is ignored, so the page always has a month selected.
export default function MonthSelector({ value, onChange, label = 'Month', disabled = false }) {
    const id = useId();
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <div className="month-selector__controls">
                <button type="button" className="btn btn--secondary btn--icon" disabled={disabled}
                    onClick={() => onChange(shiftMonth(value, -1))} aria-label={`Previous month, ${formatMonth(shiftMonth(value, -1))}`}>
                    <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <input id={id} type="month" value={value} disabled={disabled}
                    onChange={(event) => { if (event.target.value) onChange(event.target.value); }} />
                <button type="button" className="btn btn--secondary btn--icon" disabled={disabled}
                    onClick={() => onChange(shiftMonth(value, 1))} aria-label={`Next month, ${formatMonth(shiftMonth(value, 1))}`}>
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
