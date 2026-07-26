import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getCase, updateCase } from "../api/cases";
import { createNote, destroyNote, updateNote } from "../api/notes";
import { createTask, listTasks, updateTask } from "../api/tasks";
import { ApiError } from "../api/http";
import { OrionBreadcrumbs, type BreadcrumbItem } from "../components/OrionBreadcrumbs";
import { useAuth } from "../context/AuthContext";
import { formatTaskDate, TaskStatusTag, TaskTitleLink } from "../lib/tasks";
import type { CaseDetail, Note, Task } from "../types/domain";

function caseBreadcrumbItems(kase: CaseDetail): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Magistrates", to: "/magistrates" }];
  if (kase.magistrate_id) {
    items.push({
      label: kase.magistrate?.display_name ?? "Magistrate",
      to: `/magistrates/${kase.magistrate_id}`,
    });
  }
  items.push({ label: kase.public_id ?? kase.title });
  return items;
}

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

export function CaseDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [kase, setKase] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [linkTaskId, setLinkTaskId] = useState("");
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [caseStatus, setCaseStatus] = useState("open");
  const [caseSummary, setCaseSummary] = useState("");

  const canManageTasks = session?.role === "Bench Chair" || session?.role === "Developer";

  function reload() {
    if (!id) return;
    setLoading(true);
    getCase(id)
      .then((loaded) => {
        setKase(loaded);
        setCaseStatus(loaded.status);
        setCaseSummary(loaded.summary ?? "");
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load case"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!canManageTasks) return;
    listTasks({ status: "open" })
      .then((response) => setOpenTasks(response.tasks.filter((task) => !task.case_id)))
      .catch(() => setOpenTasks([]));
  }, [canManageTasks, kase?.id]);

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();
    if (!kase || !noteBody.trim()) return;
    setSavingNote(true);
    setError(null);
    try {
      await createNote(kase.id, { body: noteBody.trim() });
      setNoteBody("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add note");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleUpdateNote(note: Note) {
    if (!editBody.trim()) return;
    try {
      await updateNote(note.id, { body: editBody.trim() });
      setEditingNoteId(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update note");
    }
  }

  async function handleDeleteNote(note: Note) {
    if (!kase) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      await destroyNote(kase.id, note.id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete note");
    }
  }

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!kase || !taskTitle.trim()) return;
    setCreatingTask(true);
    setError(null);
    try {
      await createTask({
        title: taskTitle.trim(),
        case_id: kase.id,
        note_id: kase.notes[0]?.id ?? null,
      });
      setTaskTitle("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create task");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleLinkTask(event: FormEvent) {
    event.preventDefault();
    if (!kase || !linkTaskId.trim()) return;
    try {
      await updateTask(linkTaskId.trim(), { case_id: kase.id });
      setLinkTaskId("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not link task");
    }
  }

  async function handleSaveCase(event: FormEvent) {
    event.preventDefault();
    if (!kase) return;
    try {
      const updated = await updateCase(kase.id, {
        status: caseStatus,
        summary: caseSummary.trim() || null,
      });
      setKase(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update case");
    }
  }

  if (loading) return <p className="govuk-body">Loading…</p>;
  if (!kase) {
    return (
      <>
        <p className="govuk-body">{error ?? "Case not found"}</p>
        <Link to="/" className="govuk-link">
          Back to dashboard
        </Link>
      </>
    );
  }

  const linkedTasks = kase.tasks ?? [];

  return (
    <>
      <OrionBreadcrumbs items={caseBreadcrumbItems(kase)} />

      <h1 className="govuk-heading-xl">{kase.title}</h1>
      <p className="govuk-body">
        <span className="govuk-!-margin-right-2">{kase.public_id}</span>
        <strong className={`govuk-tag ${kase.status === "open" ? "govuk-tag--blue" : "govuk-tag--grey"}`}>
          {kase.status}
        </strong>
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
          <dt className="govuk-summary-list__key">Reference</dt>
          <dd className="govuk-summary-list__value">{kase.reference ?? "—"}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Type</dt>
          <dd className="govuk-summary-list__value">{kase.case_type ?? "—"}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Created</dt>
          <dd className="govuk-summary-list__value">
            {formatDateTime(kase.created_at)}
            {kase.created_by ? ` by ${kase.created_by.display_name}` : ""}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Updated</dt>
          <dd className="govuk-summary-list__value">
            {formatDateTime(kase.updated_at)}
            {kase.updated_by ? ` by ${kase.updated_by.display_name}` : ""}
          </dd>
        </div>
      </dl>

      <form onSubmit={handleSaveCase} className="govuk-!-margin-bottom-6">
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor="case-summary">
            Summary
          </label>
          <textarea
            className="govuk-textarea"
            id="case-summary"
            rows={3}
            value={caseSummary}
            onChange={(event) => setCaseSummary(event.target.value)}
          />
        </div>
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor="case-status">
            Status
          </label>
          <select
            className="govuk-select"
            id="case-status"
            value={caseStatus}
            onChange={(event) => setCaseStatus(event.target.value)}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button type="submit" className="govuk-button govuk-button--secondary">
          Save case
        </button>
      </form>

      <h2 className="govuk-heading-l">Timeline</h2>
      {kase.notes.length === 0 ? (
        <p className="govuk-body">No notes yet.</p>
      ) : (
        <ol className="govuk-list">
          {kase.notes.map((note) => (
            <li key={note.id} className="govuk-!-margin-bottom-6">
              <p className="govuk-body-s govuk-!-margin-bottom-1">
                <Link to={`/notes/${note.public_id || note.id}`} className="govuk-link">
                  {note.public_id}
                </Link>
                {" · "}
                {formatDateTime(note.occurred_at ?? note.created_at)}
                {" · "}
                {note.author ?? note.author_name ?? "Unknown"}
              </p>
              {editingNoteId === note.id ? (
                <>
                  <textarea
                    className="govuk-textarea"
                    rows={3}
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                  />
                  <button
                    type="button"
                    className="govuk-button govuk-!-margin-right-2"
                    onClick={() => void handleUpdateNote(note)}
                  >
                    Save note
                  </button>
                  <button
                    type="button"
                    className="govuk-button govuk-button--secondary"
                    onClick={() => setEditingNoteId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="govuk-body" style={{ whiteSpace: "pre-wrap" }}>
                    {note.body}
                  </p>
                  <button
                    type="button"
                    className="govuk-link govuk-body govuk-!-margin-right-3"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onClick={() => {
                      setEditingNoteId(note.id);
                      setEditBody(note.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="govuk-link govuk-body"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onClick={() => void handleDeleteNote(note)}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={handleAddNote} className="govuk-!-margin-bottom-8">
        <div className="govuk-form-group">
          <label className="govuk-label govuk-label--m" htmlFor="new-note">
            Add note
          </label>
          <textarea
            className="govuk-textarea"
            id="new-note"
            rows={4}
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            required
          />
        </div>
        <button type="submit" className="govuk-button" disabled={savingNote || !noteBody.trim()}>
          {savingNote ? "Saving…" : "Add note"}
        </button>
      </form>

      <h2 className="govuk-heading-l">Linked tasks</h2>
      {linkedTasks.length === 0 ? (
        <p className="govuk-body">No tasks linked to this case.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                ID
              </th>
              <th scope="col" className="govuk-table__header">
                Title
              </th>
              <th scope="col" className="govuk-table__header">
                Status
              </th>
              <th scope="col" className="govuk-table__header">
                Due
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {linkedTasks.map((task) => (
              <tr key={task.id} className="govuk-table__row">
                <td className="govuk-table__cell">{task.public_id ?? task.id}</td>
                <td className="govuk-table__cell">
                  <TaskTitleLink task={task} />
                </td>
                <td className="govuk-table__cell">
                  <TaskStatusTag status={task.status} />
                </td>
                <td className="govuk-table__cell">{formatTaskDate(task.due_on)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManageTasks && (
        <div className="govuk-!-margin-top-6">
          <form onSubmit={handleCreateTask} className="govuk-!-margin-bottom-4">
            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor="case-task-title">
                Create task for this case
              </label>
              <input
                className="govuk-input govuk-!-width-two-thirds"
                id="case-task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="govuk-button" disabled={creatingTask || !taskTitle.trim()}>
              {creatingTask ? "Creating…" : "Create task"}
            </button>
          </form>

          <form onSubmit={handleLinkTask}>
            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor="link-existing-task">
                Link existing open task
              </label>
              <select
                className="govuk-select"
                id="link-existing-task"
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
