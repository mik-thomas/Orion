import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getCase, updateCase } from "../api/cases";
import { getMagistrate } from "../api/magistrates";
import { createNote, destroyNote, updateNote } from "../api/notes";
import { createTask, listTasks, updateTask } from "../api/tasks";
import { ApiError } from "../api/http";
import {
  CasebookActionBar,
  CasebookMetaRow,
  CasebookSplit,
  CasebookTabPanel,
  CasebookTabs,
} from "../components/casebook/CasebookChrome";
import { MagistrateSidebar } from "../components/MagistrateSidebar";
import { OrionBreadcrumbs, type BreadcrumbItem } from "../components/OrionBreadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { formatTaskDate, TaskStatusTag, TaskTitleLink } from "../lib/tasks";
import type { CaseDetail, MagistrateDetail, Note, Task } from "../types/domain";

function caseBreadcrumbItems(kase: CaseDetail): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Home", to: "/" }, { label: "Magistrates", to: "/magistrates" }];
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
  const { canViewNames } = useRole();
  const [kase, setKase] = useState<CaseDetail | null>(null);
  const [magistrate, setMagistrate] = useState<MagistrateDetail | null>(null);
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
  const [activeTab, setActiveTab] = useState("detail");
  const [showAddNote, setShowAddNote] = useState(false);

  const canManageTasks = session?.role === "Bench Chair" || session?.role === "Developer";

  function reload() {
    if (!id) return;
    setLoading(true);
    getCase(id)
      .then((loaded) => {
        setKase(loaded);
        setCaseStatus(loaded.status);
        setCaseSummary(loaded.summary ?? "");
        if (loaded.magistrate_id) {
          getMagistrate(loaded.magistrate_id)
            .then(setMagistrate)
            .catch(() => setMagistrate(null));
        } else {
          setMagistrate(null);
        }
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
      setShowAddNote(false);
      setActiveTab("notes");
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
      setActiveTab("tasks");
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
      setActiveTab("tasks");
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
          Back to home
        </Link>
      </>
    );
  }

  const linkedTasks = kase.tasks ?? [];

  return (
    <>
      <OrionBreadcrumbs items={caseBreadcrumbItems(kase)} />

      <CasebookSplit
        main={
          <>
            <h1 className="govuk-heading-xl csbk-page-title">{kase.title}</h1>
            <CasebookMetaRow>
              {kase.public_id ? `${kase.public_id} · ` : ""}
              Created: {formatDateTime(kase.created_at)}
              {kase.created_by ? ` by ${kase.created_by.display_name}` : ""}
              {" · "}
              <strong className={`govuk-tag ${kase.status === "open" ? "govuk-tag--blue" : "govuk-tag--grey"}`}>
                {kase.status}
              </strong>
            </CasebookMetaRow>

            <CasebookActionBar
              actions={[
                {
                  label: "Edit case",
                  primary: true,
                  onClick: () => setActiveTab("detail"),
                },
                {
                  label: "Add note",
                  primary: true,
                  onClick: () => {
                    setActiveTab("notes");
                    setShowAddNote(true);
                  },
                },
                ...(canManageTasks
                  ? [
                      {
                        label: "Add task",
                        primary: true,
                        onClick: () => setActiveTab("tasks"),
                      },
                    ]
                  : []),
                ...(kase.magistrate_id
                  ? [
                      {
                        label: "View magistrate",
                        href: `/magistrates/${kase.magistrate_id}`,
                      },
                    ]
                  : []),
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

            <CasebookTabs
              tabs={[
                { id: "detail", label: "Case detail" },
                { id: "notes", label: "Notes", count: kase.notes.length },
                { id: "tasks", label: "Tasks", count: linkedTasks.length },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            <CasebookTabPanel id="detail" activeId={activeTab}>
              <form onSubmit={handleSaveCase}>
                <CasebookMetaRow>
                  Reference: {kase.reference ?? "—"} · Type: {kase.case_type ?? "—"} · Updated:{" "}
                  {formatDateTime(kase.updated_at)}
                  {kase.updated_by ? ` by ${kase.updated_by.display_name}` : ""}
                </CasebookMetaRow>
                <div className="govuk-form-group">
                  <label className="govuk-label" htmlFor="case-summary">
                    Summary
                  </label>
                  <textarea
                    className="govuk-textarea"
                    id="case-summary"
                    rows={4}
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
                <button type="submit" className="govuk-button">
                  Save case
                </button>
              </form>
            </CasebookTabPanel>

            <CasebookTabPanel id="notes" activeId={activeTab}>
              <div className="govuk-!-margin-bottom-4">
                <strong>Case notes ({kase.notes.length})</strong>
              </div>

              {kase.notes.length === 0 && !showAddNote ? (
                <p className="govuk-body">No notes yet.</p>
              ) : null}

              {kase.notes.map((note) => (
                <article key={note.id} className="csbk-note-card">
                  <header className="csbk-note-card__header">
                    <strong className="govuk-tag govuk-tag--blue">Note</strong>
                    <h3 className="csbk-note-card__title">
                      <Link to={`/notes/${note.public_id || note.id}`} className="govuk-link">
                        {note.public_id ?? `Note ${note.id}`}
                      </Link>
                    </h3>
                    <span>{formatDateTime(note.occurred_at ?? note.created_at)}</span>
                  </header>
                  <p className="csbk-note-card__meta">
                    Created: {formatDateTime(note.created_at)} · By{" "}
                    {note.author ?? note.author_name ?? "Unknown"}
                  </p>
                  <div className="csbk-note-card__body">
                    <div>
                      {editingNoteId === note.id ? (
                        <textarea
                          className="govuk-textarea"
                          rows={4}
                          value={editBody}
                          onChange={(event) => setEditBody(event.target.value)}
                        />
                      ) : (
                        <p className="govuk-body" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                          {note.body}
                        </p>
                      )}
                    </div>
                    <div className="csbk-note-card__next">
                      <p className="csbk-note-card__next-title">Case</p>
                      <p className="govuk-body-s govuk-!-margin-bottom-0">{kase.title}</p>
                    </div>
                  </div>
                  <footer className="csbk-note-card__footer">
                    {editingNoteId === note.id ? (
                      <>
                        <button
                          type="button"
                          className="csbk-action-bar__btn csbk-action-bar__btn--primary"
                          onClick={() => void handleUpdateNote(note)}
                        >
                          Save note
                        </button>
                        <button
                          type="button"
                          className="csbk-action-bar__btn"
                          onClick={() => setEditingNoteId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/notes/${note.public_id || note.id}`}
                          className="csbk-action-bar__btn csbk-action-bar__btn--primary"
                        >
                          View full note
                        </Link>
                        <button
                          type="button"
                          className="csbk-action-bar__btn csbk-action-bar__btn--primary"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditBody(note.body);
                          }}
                        >
                          Edit note
                        </button>
                        <button
                          type="button"
                          className="csbk-action-bar__btn"
                          onClick={() => void handleDeleteNote(note)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </footer>
                </article>
              ))}

              {showAddNote || kase.notes.length === 0 ? (
                <form onSubmit={handleAddNote} className="csbk-note-card">
                  <header className="csbk-note-card__header">
                    <h3 className="csbk-note-card__title">Add note</h3>
                  </header>
                  <div className="csbk-note-card__body" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="govuk-form-group govuk-!-margin-bottom-0">
                      <label className="govuk-label" htmlFor="new-note">
                        Note body
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
                  </div>
                  <footer className="csbk-note-card__footer">
                    <button
                      type="submit"
                      className="csbk-action-bar__btn csbk-action-bar__btn--primary"
                      disabled={savingNote || !noteBody.trim()}
                    >
                      {savingNote ? "Saving…" : "Save note"}
                    </button>
                    {showAddNote ? (
                      <button
                        type="button"
                        className="csbk-action-bar__btn"
                        onClick={() => setShowAddNote(false)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </footer>
                </form>
              ) : (
                <button
                  type="button"
                  className="govuk-button"
                  onClick={() => setShowAddNote(true)}
                >
                  Add note
                </button>
              )}
            </CasebookTabPanel>

            <CasebookTabPanel id="tasks" activeId={activeTab}>
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
                <div className="govuk-!-margin-top-4">
                  <form onSubmit={handleCreateTask} className="govuk-!-margin-bottom-4">
                    <div className="govuk-form-group">
                      <label className="govuk-label" htmlFor="case-task-title">
                        Create task for this case
                      </label>
                      <input
                        className="govuk-input"
                        id="case-task-title"
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="govuk-button"
                      disabled={creatingTask || !taskTitle.trim()}
                    >
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
            </CasebookTabPanel>
          </>
        }
        sidebar={
          magistrate ? (
            <MagistrateSidebar
              magistrate={magistrate}
              canViewNames={canViewNames}
              profileHref={`/magistrates/${magistrate.id}`}
              onContactNumberUpdated={(contactNumber) =>
                setMagistrate((current) =>
                  current ? { ...current, contact_number: contactNumber } : current
                )
              }
            />
          ) : kase.magistrate ? (
            <aside className="csbk-sidebar" aria-label="Magistrate">
              <div className="csbk-sidebar__header">
                {kase.magistrate.display_name}
              </div>
              <div className="csbk-sidebar__body" style={{ padding: "1rem" }}>
                <Link to={`/magistrates/${kase.magistrate.id}`} className="govuk-link">
                  View magistrate profile
                </Link>
              </div>
            </aside>
          ) : (
            <aside className="csbk-sidebar" aria-label="Magistrate">
              <div className="csbk-sidebar__header">No magistrate linked</div>
            </aside>
          )
        }
      />
    </>
  );
}
