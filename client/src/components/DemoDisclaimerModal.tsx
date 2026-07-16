import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dismissDemoDisclaimer, isDemoDisclaimerDismissed } from "../lib/demoDisclaimer";

/**
 * Post-login disclaimer for roles that see anonymised / demo magistrate data.
 * Skipped for Developer (real identifiable data). Dismissal is session-scoped.
 */
export function DemoDisclaimerModal() {
  const { session } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const handleDismiss = useCallback(() => {
    dismissDemoDisclaimer();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!session || session.role === "Developer") {
      setOpen(false);
      return;
    }
    setOpen(!isDemoDisclaimerDismissed());
  }, [session]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      continueButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleCancel(event: Event) {
      event.preventDefault();
      handleDismiss();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [handleDismiss]);

  if (!session || session.role === "Developer") {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="orion-dialog"
      aria-labelledby="demo-disclaimer-title"
      aria-describedby="demo-disclaimer-body"
    >
      <div className="orion-dialog__panel">
        <div className="govuk-notification-banner govuk-notification-banner--warning" role="region">
          <div className="govuk-notification-banner__header">
            <h2 className="govuk-notification-banner__title" id="demo-disclaimer-title">
              Demonstration data
            </h2>
          </div>
          <div className="govuk-notification-banner__content">
            <p className="govuk-body" id="demo-disclaimer-body">
              The data shown in this application is fictitious and is used for demonstration purposes
              only.
            </p>
          </div>
        </div>
        <button
          ref={continueButtonRef}
          type="button"
          className="govuk-button"
          data-module="govuk-button"
          onClick={handleDismiss}
        >
          Continue
        </button>
      </div>
    </dialog>
  );
}
