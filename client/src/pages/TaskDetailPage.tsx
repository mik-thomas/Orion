import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cancelTask, getTask, listTasks, updateTask } from "../api/tasks";
import { ApiError } from "../api/http";
import { useAuth } from "../context/AuthContext";
import {
  formatTaskDate,
  TASK_STATUSES,
  TaskStatusTag,
  taskPriorityLabel,
  taskStatusLabel,
} from "../lib/tasks";
import type { RelatedItem, Task, TaskStatus } from "../types/domain";

export function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<TaskStatus>("open");
  const [reportNotes, setReportNotes] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [reminderOn, setReminderOn] = useState("");
  const [linkCaseId, setLinkCaseId] = useState("");
  const [linkNoteId, setLinkNoteId] = useState("");
  const [openTasks, setOpenTasks] = useState<Task[]>([]);

  const canManage = session?.role === "Bench Chair" || session?.role === "Developer";
  const canReport =
    session?.role === "Deputy" || session?.role === "Bench Chair" || session?.role === "Developer";

  useEffect(() => {
    if (!id) {
      setError("Task not found");
      setLoading(false);
      return;
    }

    getTask(id)
      .then((loaded) => {
        setTask(loaded);
        setStatus(loaded.status);
        setReportNotes(loaded.report_notes ?? "");
        setTitle(loaded.title);
        setDescription(loaded.description ?? "");
        setDueOn(loaded.due_on ?? "");
        setReminderOn(loaded.reminder_on ?? "");
        setLinkCaseId(loaded.case_id ? String(loaded.case_id) : "");
        setLinkNoteId(loaded.note_id ? String(loaded.note_id) : "");
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load task"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!canManage) return;
    listTasks({ status: "open" })
      .then((response) => setOpenTasks(response.tasks))
      .catch(() => setOpenTasks([]));
  }, [canManage]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
    setSaving(true);
    setError(null);
    try {
      const payload = canManage
        ? {
            title: title.trim(),
            description: description.trim() || null,
            status,
            due_on: dueOn || null,
            reminder_on: reminderOn || null,
            report_notes: reportNotes.trim() || null,
            case_id: linkCaseId.trim() ? Number(linkCaseId) : null,
            note_id: linkNoteId.trim() ? Number(linkNoteId) : null,
          }
        : {
            status,
            report_notes: reportNotes.trim() || null,
          };
      const updated = await updateTask(task.id, payload);
      applyTask(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save task");
    } finally {
      setSaving(false);
    }
  }

  function applyTask(updated: Task) {
    setTask(updated);
    setStatus(updated.status);
    setReportNotes(updated.report_notes ?? "");
    setTitle(updated.title);
    setDescription(updated.description ?? "");
    setDueOn(updated.due_on ?? "");
    setReminderOn(updated.reminder_on ?? "");
    setLinkCaseId(updated.case_id ? String(updated.case_id) : "");
    setLinkNoteId(updated.note_id ? String(updated.note_id) : "");
  }

  async function handleCancel() {
    if (!task) return;
    if (!window.confirm(`Close task “${task.title}”?`)) return;
    try {
      const updated = await cancelTask(task.id);
      applyTask(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not close task");
    }
  }

  if (loading) {
    return <p className="govuk-body">Loading…</p>;
  }

  if (!task) {
    return (
      <>
        <p className="govuk-body">{error ?? "Task not found"}</p>
        <Link to="/tasks" className="govuk-link">
          Back to tasks
        </Link>
      </>
    );
  }

  const relatedItems: RelatedItem[] = task.related_items ?? [];

  return (
    <>
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <Link to="/tasks" className="govuk-breadcrumbs__link">
              Tasks
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            {task.public_id ?? task.title}
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">{task.title}</h1>
      <p className="govuk-body">
        <span className="govuk-!-margin-right-2">{task.public_id}</span>
        <TaskStatusTag status={task.status} />
        {task.overdue && (
          <strong className="govuk-tag govuk-tag--red govuk-!-margin-left-2">Overdue</strong>
        )}
      </p>

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      <dl className="govuk-summary-list">
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Delegated by</dt>
          <dd className="govuk-summary-list__value">{task.created_by.display_name}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Assigned to</dt>
          <dd className="govuk-summary-list__value">{task.assigned_to.display_name}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Priority</dt>
          <dd className="govuk-summary-list__value">{taskPriorityLabel(task.priority)}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Due</dt>
          <dd className="govuk-summary-list__value">{formatTaskDate(task.due_on)}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Reminder</dt>
          <dd className="govuk-summary-list__value">{formatTaskDate(task.reminder_on)}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Completed</dt>
          <dd className="govuk-summary-list__value">{formatTaskDate(task.completed_at)}</dd>
        </div>
        {task.updated_by && (
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Last updated by</dt>
            <dd className="govuk-summary-list__value">{task.updated_by.display_name}</dd>
          </div>
        )}
      </dl>

      {task.description && (
        <>
          <h2 className="govuk-heading-m">Description</h2>
          <p className="govuk-body" style={{ whiteSpace: "pre-wrap" }}>
            {task.description}
          </p>
        </>
      )}

      <h2 className="govuk-heading-m">Related items</h2>
      {relatedItems.length === 0 ? (
        <p className="govuk-body">No linked case or note.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Type
              </th>
              <th scope="col" className="govuk-table__header">
                ID
              </th>
              <th scope="col" className="govuk-table__header">
                Title
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {relatedItems.map((item) => (
              <tr key={`${item.type}-${item.id}`} className="govuk-table__row">
                <td className="govuk-table__cell">{item.type}</td>
                <td className="govuk-table__cell">{item.public_id ?? item.id}</td>
                <td className="govuk-table__cell">
                  <Link to={item.path_hint} className="govuk-link">
                    {item.title}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canReport ? (
        <form onSubmit={handleSave} noValidate className="govuk-!-margin-top-6">
          <h2 className="govuk-heading-m">{canManage ? "Update task" : "Report on this task"}</h2>

          {canManage && (
            <>
              <div className="govuk-form-group">
                <label className="govuk-label" htmlFor="detail-title">
                  Title
                </label>
                <input
                  className="govuk-input"
                  id="detail-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
              <div className="govuk-form-group">
                <label className="govuk-label" htmlFor="detail-description">
                  Description
                </label>
                <textarea
                  className="govuk-textarea"
                  id="detail-description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="govuk-form-group">
                <label className="govuk-label" htmlFor="detail-due-on">
                  Due date
                </label>
                <input
                  className="govuk-input govuk-input--width-10"
                  id="detail-due-on"
                  type="date"
                  value={dueOn}
                  onChange={(event) => setDueOn(event.target.value)}
                />
              </div>
              <div className="govuk-form-group">
                <label className="govuk-label" htmlFor="detail-reminder-on">
                  Reminder date
                </label>
                <input
                  className="govuk-input govuk-input--width-10"
                  id="detail-reminder-on"
                  type="date"
                  value={reminderOn}
                  onChange={(event) => setReminderOn(event.target.value)}
                />
              </div>
              <div className="govuk-form-group">
                <label className="govuk-label" htmlFor="detail-case-id">
                  Link case ID (numeric)
                </label>
                <input
                  className="govuk-input govuk-input--width-10"
                  id="detail-case-id"
                  value={linkCaseId}
                  onChange={(event) => setLinkCaseId(event.target.value)}
                  list="open-task-case-hints"
                />
              </div>
              <div className="govuk-form-group">
                <label className="govuk-label" htmlFor="detail-note-id">
                  Link note ID (numeric)
                </label>
                <input
                  className="govuk-input govuk-input--width-10"
                  id="detail-note-id"
                  value={linkNoteId}
                  onChange={(event) => setLinkNoteId(event.target.value)}
                />
              </div>
              {openTasks.length > 0 && (
                <datalist id="open-task-case-hints">
                  {openTasks
                    .filter((row) => row.case_id)
                    .map((row) => (
                      <option key={row.id} value={String(row.case_id)}>
                        {row.public_id}: {row.title}
                      </option>
                    ))}
                </datalist>
              )}
            </>
          )}

          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="detail-status">
              Status
            </label>
            <select
              className="govuk-select"
              id="detail-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {taskStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="detail-report-notes">
              Report notes / outcome
            </label>
            <div className="govuk-hint" id="detail-report-notes-hint">
              Deputies record progress and outcomes here for Bench Chair reporting.
            </div>
            <textarea
              className="govuk-textarea"
              id="detail-report-notes"
              aria-describedby="detail-report-notes-hint"
              rows={5}
              value={reportNotes}
              onChange={(event) => setReportNotes(event.target.value)}
            />
          </div>

          <button type="submit" className="govuk-button" disabled={saving}>
            {saving ? "Saving…" : "Save updates"}
          </button>
          {canManage && task.status === "open" && (
            <button
              type="button"
              className="govuk-button govuk-button--warning govuk-!-margin-left-2"
              onClick={() => void handleCancel()}
            >
              Close task
            </button>
          )}
          <button
            type="button"
            className="govuk-button govuk-button--secondary govuk-!-margin-left-2"
            onClick={() => navigate("/tasks")}
          >
            Back to list
          </button>
        </form>
      ) : (
        <>
          <h2 className="govuk-heading-m">Report notes</h2>
          <p className="govuk-body">{task.report_notes || "No report notes yet."}</p>
          <Link to="/tasks" className="govuk-link">
            Back to tasks
          </Link>
        </>
      )}
    </>
  );
}
