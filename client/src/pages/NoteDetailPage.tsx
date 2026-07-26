import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getNote, updateNote } from "../api/notes";
import { createTask, listTasks, updateTask } from "../api/tasks";
import { ApiError } from "../api/http";
import { useAuth } from "../context/AuthContext";
import type { Note, Task } from "../types/domain";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [linkTaskId, setLinkTaskId] = useState("");
  const [openTasks, setOpenTasks] = useState<Task[]>([]);

  const canManageTasks = session?.role === "Bench Chair" || session?.role === "Developer";

  useEffect(() => {
    if (!id) return;
    getNote(id)
      .then((loaded) => {
        setNote(loaded);
        setBody(loaded.body);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load note"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!canManageTasks) return;
    listTasks({ status: "open" })
      .then((response) => setOpenTasks(response.tasks.filter((task) => !task.note_id)))
      .catch(() => setOpenTasks([]));
  }, [canManageTasks]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!note) return;
    setSaving(true);
    try {
      const updated = await updateNote(note.id, { body: body.trim() });
      setNote(updated);
      setBody(updated.body);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!note || !taskTitle.trim()) return;
    try {
      await createTask({ title: taskTitle.trim(), case_id: note.case_id, note_id: note.id });
      setTaskTitle("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create task");
    }
  }

  async function handleLinkTask(event: FormEvent) {
    event.preventDefault();
    if (!note || !linkTaskId) return;
    try {
      await updateTask(linkTaskId, { note_id: note.id, case_id: note.case_id });
      setLinkTaskId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not link task");
    }
  }

  if (loading) return <p className="govuk-body">Loading…</p>;
  if (!note) {
    return <p className="govuk-body">{error ?? "Note not found"}</p>;
  }

  return (
    <>
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <Link to={`/cases/${note.case_id}`} className="govuk-breadcrumbs__link">
              Case
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            {note.public_id ?? `Note ${note.id}`}
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">{note.public_id ?? `Note ${note.id}`}</h1>
      <p className="govuk-body">
        {formatDateTime(note.occurred_at ?? note.created_at)} · {note.author ?? note.author_name ?? "Unknown"}
      </p>

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor="note-body">
            Note
          </label>
          <textarea
            className="govuk-textarea"
            id="note-body"
            rows={8}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </div>
        <button type="submit" className="govuk-button" disabled={saving}>
          {saving ? "Saving…" : "Save note"}
        </button>
        <Link to={`/cases/${note.case_id}`} className="govuk-button govuk-button--secondary govuk-!-margin-left-2">
          Back to case
        </Link>
      </form>

      {canManageTasks && (
        <div className="govuk-!-margin-top-8">
          <h2 className="govuk-heading-m">Tasks</h2>
          <form onSubmit={handleCreateTask} className="govuk-!-margin-bottom-4">
            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor="note-task-title">
                Create task from this note
              </label>
              <input
                className="govuk-input govuk-!-width-two-thirds"
                id="note-task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="govuk-button" disabled={!taskTitle.trim()}>
              Create task
            </button>
          </form>
          <form onSubmit={handleLinkTask}>
            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor="note-link-task">
                Link existing open task
              </label>
              <select
                className="govuk-select"
                id="note-link-task"
                value={linkTaskId}
                onChange={(event) => setLinkTaskId(event.target.value)}
              >
                <option value="">Select a task</option>
                {openTasks.map((task) => (
                  <option key={task.id} value={String(task.id)}>
                    {task.public_id}: {task.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="govuk-button govuk-button--secondary" disabled={!linkTaskId}>
              Link task
            </button>
          </form>
        </div>
      )}
    </>
  );
}
