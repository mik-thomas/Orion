import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getMagistrate } from "../api/magistrates";
import { getNote, updateNote } from "../api/notes";
import { createTask, listTasks, updateTask } from "../api/tasks";
import { ApiError } from "../api/http";
import {
  CasebookActionBar,
  CasebookMetaRow,
  CasebookSplit,
} from "../components/casebook/CasebookChrome";
import { MagistrateSidebar } from "../components/MagistrateSidebar";
import { OrionBreadcrumbs, type BreadcrumbItem } from "../components/OrionBreadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import type { MagistrateDetail, Note, Task } from "../types/domain";

function noteBreadcrumbItems(note: Note): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Home", to: "/" }];
  const magistrateId = note.magistrate_id ?? note.case?.magistrate_id ?? note.case?.magistrate?.id;
  const magistrateName =
    note.magistrate_name ?? note.case?.magistrate?.display_name ?? "Magistrate";
  const caseRef = note.case?.public_id ?? (note.case_id ? `Case ${note.case_id}` : null);
  const casePath = note.case
    ? `/cases/${note.case.public_id ?? note.case.id}`
    : `/cases/${note.case_id}`;

  if (magistrateId) {
    items.push({ label: "Magistrates", to: "/magistrates" });
    items.push({ label: magistrateName, to: `/magistrates/${magistrateId}` });
  }
  items.push({ label: caseRef ?? "Case", to: casePath });
  items.push({ label: note.public_id ?? `Note ${note.id}` });
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

export function NoteDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { canViewNames } = useRole();
  const [note, setNote] = useState<Note | null>(null);
  const [magistrate, setMagistrate] = useState<MagistrateDetail | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [linkTaskId, setLinkTaskId] = useState("");
  const [openTasks, setOpenTasks] = useState<Task[]>([]);

  const canManageTasks = session?.role === "Bench Chair" || session?.role === "Developer";
  const casePath = note?.case
    ? `/cases/${note.case.public_id ?? note.case.id}`
    : note
      ? `/cases/${note.case_id}`
      : "/";

  useEffect(() => {
    if (!id) return;
    getNote(id)
      .then((loaded) => {
        setNote(loaded);
        setBody(loaded.body);
        const magistrateId =
          loaded.magistrate_id ?? loaded.case?.magistrate_id ?? loaded.case?.magistrate?.id;
        if (magistrateId) {
          getMagistrate(magistrateId)
            .then(setMagistrate)
            .catch(() => setMagistrate(null));
        }
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
      <OrionBreadcrumbs items={noteBreadcrumbItems(note)} />

      <CasebookSplit
        main={
          <>
            <h1 className="govuk-heading-xl csbk-page-title">
              {note.public_id ?? `Note ${note.id}`}
            </h1>
            <CasebookMetaRow>
              {formatDateTime(note.occurred_at ?? note.created_at)} ·{" "}
              {note.author ?? note.author_name ?? "Unknown"}
              {note.case ? (
                <>
                  {" · Case: "}
                  <Link to={casePath} className="govuk-link">
                    {note.case.title}
                  </Link>
                </>
              ) : null}
            </CasebookMetaRow>

            <CasebookActionBar
              actions={[
                { label: "Save note", primary: true, onClick: () => {
                  const form = document.getElementById("note-edit-form") as HTMLFormElement | null;
                  form?.requestSubmit();
                }},
                { label: "Back to case", href: casePath },
              ]}
            />

            {error && (
              <div className="govuk-error-summary" role="alert">
                <h2 className="govuk-error-summary__title">There is a problem</h2>
                <div className="govuk-error-summary__body">
                  <p className="govuk-body">{error}</p>
                </div>
              </div>
            )}

            <article className="csbk-note-card">
              <header className="csbk-note-card__header">
                <strong className="govuk-tag govuk-tag--blue">Note</strong>
                <h2 className="csbk-note-card__title">{note.public_id ?? `Note ${note.id}`}</h2>
                <span>{formatDateTime(note.occurred_at ?? note.created_at)}</span>
              </header>
              <p className="csbk-note-card__meta">
                Created: {formatDateTime(note.created_at)} · By{" "}
                {note.author ?? note.author_name ?? "Unknown"}
                {note.updated_by ? ` · Last edited by ${note.updated_by.display_name}` : ""}
              </p>
              <form id="note-edit-form" onSubmit={handleSave}>
                <div className="csbk-note-card__body">
                  <div className="govuk-form-group govuk-!-margin-bottom-0">
                    <label className="govuk-label" htmlFor="note-body">
                      Note summary
                    </label>
                    <textarea
                      className="govuk-textarea"
                      id="note-body"
                      rows={10}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      required
                    />
                  </div>
                  <div className="csbk-note-card__next">
                    <p className="csbk-note-card__next-title">Next steps</p>
                    <p className="govuk-body-s">
                      Use tasks to track follow-up from this note.
                    </p>
                    {canManageTasks ? (
                      <p className="govuk-body-s govuk-!-margin-bottom-0">
                        Create or link a task below.
                      </p>
                    ) : null}
                  </div>
                </div>
                <footer className="csbk-note-card__footer">
                  <button type="submit" className="csbk-action-bar__btn csbk-action-bar__btn--primary" disabled={saving}>
                    {saving ? "Saving…" : "Save note"}
                  </button>
                  <Link to={casePath} className="csbk-action-bar__btn">
                    View case
                  </Link>
                </footer>
              </form>
            </article>

            {canManageTasks && (
              <div className="csbk-search-card govuk-!-margin-top-4">
                <h2 className="govuk-heading-m">Tasks from this note</h2>
                <form onSubmit={handleCreateTask} className="govuk-!-margin-bottom-4">
                  <div className="govuk-form-group">
                    <label className="govuk-label" htmlFor="note-task-title">
                      Create task
                    </label>
                    <input
                      className="govuk-input"
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
                  <button
                    type="submit"
                    className="govuk-button govuk-button--secondary"
                    disabled={!linkTaskId}
                  >
                    Link task
                  </button>
                </form>
              </div>
            )}
          </>
        }
        sidebar={
          magistrate ? (
            <MagistrateSidebar
              magistrate={magistrate}
              canViewNames={canViewNames}
              profileHref={`/magistrates/${magistrate.id}`}
              editable={Boolean(session)}
              onMagistrateUpdated={(updated) =>
                setMagistrate((current) => (current ? { ...current, ...updated } : current))
              }
              onLeavesChanged={() => {
                if (!magistrate) return;
                getMagistrate(magistrate.id)
                  .then(setMagistrate)
                  .catch(() => undefined);
              }}
            />
          ) : (
            <aside className="csbk-sidebar" aria-label="Magistrate">
              <div className="csbk-sidebar__header">
                {note.magistrate_name ?? note.case?.magistrate?.display_name ?? "Magistrate"}
              </div>
              <div className="csbk-sidebar__body" style={{ padding: "1rem" }}>
                {(note.magistrate_id ?? note.case?.magistrate_id) ? (
                  <Link
                    to={`/magistrates/${note.magistrate_id ?? note.case?.magistrate_id}`}
                    className="govuk-link"
                  >
                    View magistrate profile
                  </Link>
                ) : (
                  <p className="govuk-body-s">No magistrate linked.</p>
                )}
              </div>
            </aside>
          )
        }
      />
    </>
  );
}
