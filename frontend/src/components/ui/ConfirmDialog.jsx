import { useEffect, useId, useRef } from 'react';
import './ui.css';

// Asks the user to confirm before something destructive (delete, exclude) or important.
// Built on the browser's native <dialog>, which already traps focus, closes on Escape and makes the
// page behind it inert. Focus starts on Cancel, so pressing Enter by accident never deletes anything.
export default function ConfirmDialog({
    open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    tone = 'danger', busy = false, onConfirm, onCancel,
}) {
    const dialogRef = useRef(null);
    const cancelRef = useRef(null);
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && !dialog.open) {
            dialog.showModal();
            cancelRef.current?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog ref={dialogRef} className="dialog" aria-labelledby={titleId} aria-describedby={messageId}
            // Escape fires "cancel": let React's open prop decide when it really closes
            onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
            <h2 className="dialog__title" id={titleId}>{title}</h2>
            <p className="dialog__message" id={messageId}>{message}</p>
            <div className="dialog__actions">
                <button type="button" ref={cancelRef} className="btn btn--secondary" onClick={onCancel} disabled={busy}>
                    {cancelLabel}
                </button>
                <button type="button" className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
                    onClick={onConfirm} disabled={busy}>
                    {busy ? 'Working…' : confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
