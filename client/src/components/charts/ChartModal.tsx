import { useEffect, useId, useRef, type ReactNode } from "react";

type ChartModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ChartModal({ title, open, onClose, children }: ChartModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleCancel(event: Event) {
      event.preventDefault();
      onClose();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="orion-dialog orion-dialog--chart"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="orion-dialog__panel">
        <div className="orion-dialog__header">
          <h2 className="govuk-heading-m govuk-!-margin-bottom-0" id={titleId}>
            {title} chart
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="orion-dialog__close govuk-link govuk-body govuk-!-margin-bottom-0"
            onClick={onClose}
          >
            Close<span className="govuk-visually-hidden"> {title} chart</span>
          </button>
        </div>
        <div className="orion-dialog__body">{children}</div>
      </div>
    </dialog>
  );
}
