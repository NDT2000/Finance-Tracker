import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import './ui.css';

// A dialog for forms (add/edit transaction, assign account, export). Native <dialog>: focus stays
// inside, the page behind is inert, Escape closes it (unless busy) and focus returns to the opener.
// The first form field receives focus when it opens.
export default function Modal({ open, title, description, onClose, busy = false, children }) {
    const dialogRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && !dialog.open) {
            dialog.showModal();
            dialog.querySelector('input:not([type=hidden]), select, textarea')?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog ref={dialogRef} className="dialog modal" aria-labelledby={titleId}
            onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
            <div className="modal__header">
                <div>
                    <h2 className="dialog__title" id={titleId}>{title}</h2>
                    {description && <p className="card__description">{description}</p>}
                </div>
                <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} disabled={busy} aria-label="Close">
                    <X size={20} aria-hidden="true" />
                </button>
            </div>
            {open && children}
        </dialog>
    );
}
