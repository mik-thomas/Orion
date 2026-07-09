import { useEffect, useRef } from "react";
import { dismissRetirementAlert, formatUkDate } from "../lib/retirement";

interface RetirementDueModalProps {
  magistrateId: number;
  retirementOn: string;
  open: boolean;
  onDismiss: () => void;
}

export function RetirementDueModal({ magistrateId, retirementOn, open, onDismiss }: RetirementDueModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleDismiss() {
    dismissRetirementAlert(magistrateId);
    onDismiss();
  }

  return (
    <dialog ref={dialogRef} className="orion-dialog" aria-labelledby="retirement-due-title">
      <div className="orion-dialog__panel">
        <div className="govuk-notification-banner govuk-notification-banner--warning" role="region">
          <div className="govuk-notification-banner__header">
            <h2 className="govuk-notification-banner__title" id="retirement-due-title">
              Retirement due
            </h2>
          </div>
          <div className="govuk-notification-banner__content">
            <p className="govuk-body">
              This magistrate is set to retire on <strong>{formatUkDate(retirementOn)}</strong>. The leaving
              process should now start.
            </p>
          </div>
        </div>
        <button type="button" className="govuk-button" data-module="govuk-button" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </dialog>
  );
}
