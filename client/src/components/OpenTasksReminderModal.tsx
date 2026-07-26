import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTasks } from "../api/tasks";
import { useAuth } from "../context/AuthContext";
import {
  dismissOpenTasksReminder,
  isOpenTasksReminderDismissed,
} from "../lib/openTasksReminder";
import { formatTaskDate } from "../lib/tasks";
import type { Task } from "../types/domain";

/**
 * After sign-in, reminds the user of open tasks ordered by due date.
 * Shown for all roles (including Developer). Dismissible for the session.
 */
export function OpenTasksReminderModal() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleDismiss = useCallback(() => {
    dismissOpenTasksReminder();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!session || isOpenTasksReminderDismissed()) {
      setOpen(false);
      return;
    }

    let cancelled = false;
    listTasks({ status: "open" })
      .then((response) => {
        if (cancelled) return;
        const openTasks = response.tasks;
        setTasks(openTasks);
        setOpen(openTasks.length > 0);
      })
      .catch(() => {
        if (!cancelled) setOpen(false);
      });

    return () => {
      cancelled = true;
    };
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

  if (!session || tasks.length === 0) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="orion-dialog"
      aria-labelledby="open-tasks-reminder-title"
      aria-describedby="open-tasks-reminder-body"
    >
      <div className="orion-dialog__panel">
        <div className="govuk-notification-banner" role="region">
          <div className="govuk-notification-banner__header">
            <h2 className="govuk-notification-banner__title" id="open-tasks-reminder-title">
              Open tasks
            </h2>
          </div>
          <div className="govuk-notification-banner__content">
            <p className="govuk-body" id="open-tasks-reminder-body">
              You have {tasks.length} open task{tasks.length === 1 ? "" : "s"}. Select a task to open it,
              or continue to dismiss this reminder for this session.
            </p>
          </div>
        </div>

        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Task
              </th>
              <th scope="col" className="govuk-table__header">
                Magistrate
              </th>
              <th scope="col" className="govuk-table__header">
                Due
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {tasks.map((task) => (
              <tr key={task.id} className="govuk-table__row">
                <td className="govuk-table__cell">
                  <button
                    type="button"
                    className="govuk-link govuk-body"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onClick={() => {
                      handleDismiss();
                      navigate(`/tasks/${task.public_id || task.id}`);
                    }}
                  >
                    {task.title}
                    {task.overdue ? " (overdue)" : ""}
                  </button>
                </td>
                <td className="govuk-table__cell">{task.magistrate_name ?? "—"}</td>
                <td className="govuk-table__cell">{formatTaskDate(task.due_on)}</td>
              </tr>
            ))}
          </tbody>
        </table>

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
