import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cancelTask, getTask, updateTask } from "../api/tasks";
import { ApiError } from "../api/http";
import { useAuth } from "../context/AuthContext";
import {
  formatTaskDate,
  TASK_STATUSES,
  TaskStatusTag,
  taskPriorityLabel,
  taskStatusLabel,
} from "../lib/tasks";
import type { Task, TaskStatus } from "../types/domain";

export function TaskDetailPage() {
  const { id } = useParams();
  const taskId = Number(id);
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

  const canManage = session?.role === "Bench Chair" || session?.role === "Developer";
  const canReport =
    session?.role === "Deputy" || session?.role === "Bench Chair" || session?.role === "Developer";

  useEffect(() => {
    if (!Number.isFinite(taskId)) {
      setError("Task not found");
      setLoading(false);
      return;
    }

    getTask(taskId)
      .then((loaded) => {
        setTask(loaded);
        setStatus(loaded.status);
        setReportNotes(loaded.report_notes ?? "");
        setTitle(loaded.title);
        setDescription(loaded.description ?? "");
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load task"))
      .finally(() => setLoading(false));
  }, [taskId]);

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
            report_notes: reportNotes.trim() || null,
          }
        : {
            status,
            report_notes: reportNotes.trim() || null,
          };
      const updated = await updateTask(task.id, payload);
      setTask(updated);
      setStatus(updated.status);
      setReportNotes(updated.report_notes ?? "");
      setTitle(updated.title);
      setDescription(updated.description ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save task");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!task) return;
    if (!window.confirm(`Cancel task “${task.title}”?`)) return;
    try {
      const updated = await cancelTask(task.id);
      setTask(updated);
      setStatus(updated.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel task");
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
            {task.title}
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">{task.title}</h1>
      <p className="govuk-body">
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
          <dt className="govuk-summary-list__key">Completed</dt>
          <dd className="govuk-summary-list__value">{formatTaskDate(task.completed_at)}</dd>
        </div>
      </dl>

      {task.description && (
        <>
          <h2 className="govuk-heading-m">Description</h2>
          <p className="govuk-body" style={{ whiteSpace: "pre-wrap" }}>
            {task.description}
          </p>
        </>
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
          {canManage && task.status !== "cancelled" && (
            <button
              type="button"
              className="govuk-button govuk-button--warning govuk-!-margin-left-2"
              onClick={() => void handleCancel()}
            >
              Cancel task
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
