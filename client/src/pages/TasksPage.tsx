import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cancelTask, createTask, listTasks, type TaskFilters } from "../api/tasks";
import { ApiError } from "../api/http";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  formatTaskDate,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskStatusTag,
  TaskTitleLink,
  taskPriorityLabel,
  taskStatusLabel,
} from "../lib/tasks";
import type { Task, TaskPriority, TaskStatus, TaskSummary } from "../types/domain";

function emptySummary(): TaskSummary {
  return { open: 0, in_progress: 0, done: 0, cancelled: 0, overdue: 0, total: 0 };
}

export function TasksPage() {
  const { session } = useAuth();
  const { role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary>(emptySummary());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueOn, setDueOn] = useState("");

  const canManage = session?.role === "Bench Chair" || session?.role === "Developer";
  const statusFilter = (searchParams.get("status") as TaskStatus | null) || "";
  const overdueOnly = searchParams.get("overdue") === "1";

  const filters = useMemo<TaskFilters>(
    () => ({
      status: statusFilter || undefined,
      overdue: overdueOnly || undefined,
    }),
    [statusFilter, overdueOnly]
  );

  function reload() {
    setLoading(true);
    setError(null);
    listTasks(filters)
      .then((response) => {
        setTasks(response.tasks);
        setSummary(response.summary);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load tasks"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when filters/role change
  }, [filters, role]);

  function setStatusFilter(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("status", next);
    else params.delete("status");
    setSearchParams(params);
  }

  function setOverdueFilter(next: boolean) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("overdue", "1");
    else params.delete("overdue");
    setSearchParams(params);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_on: dueOn || null,
      });
      setTitle("");
      setDescription("");
      setPriority("normal");
      setDueOn("");
      setShowCreate(false);
      reload();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Could not create task");
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(task: Task) {
    if (!window.confirm(`Cancel task “${task.title}”?`)) return;
    try {
      await cancelTask(task.id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel task");
    }
  }

  const completedWithNotes = tasks.filter((task) => task.status === "done" && task.report_notes);

  return (
    <>
      <h1 className="govuk-heading-xl">Tasks</h1>
      <p className="govuk-body-l">
        Bench Chair delegates work to the Deputy. Deputies update status and report outcomes.
      </p>

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      <div className="govuk-grid-row govuk-!-margin-bottom-6">
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-heading-m govuk-!-margin-bottom-1">{summary.open}</p>
          <p className="govuk-body">Open</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-heading-m govuk-!-margin-bottom-1">{summary.in_progress}</p>
          <p className="govuk-body">In progress</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-heading-m govuk-!-margin-bottom-1">{summary.done}</p>
          <p className="govuk-body">Done</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-heading-m govuk-!-margin-bottom-1">{summary.overdue}</p>
          <p className="govuk-body">Overdue</p>
        </div>
      </div>

      {canManage && (
        <div className="govuk-!-margin-bottom-6">
          {!showCreate ? (
            <button type="button" className="govuk-button" onClick={() => setShowCreate(true)}>
              Create task
            </button>
          ) : (
            <form onSubmit={handleCreate} noValidate>
              <fieldset className="govuk-fieldset">
                <legend className="govuk-fieldset__legend govuk-fieldset__legend--m">
                  Delegate a task to the Deputy
                </legend>
                {createError && (
                  <p className="govuk-error-message">
                    <span className="govuk-visually-hidden">Error:</span> {createError}
                  </p>
                )}
                <div className="govuk-form-group">
                  <label className="govuk-label" htmlFor="task-title">
                    Title
                  </label>
                  <input
                    className="govuk-input"
                    id="task-title"
                    name="title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </div>
                <div className="govuk-form-group">
                  <label className="govuk-label" htmlFor="task-description">
                    Description (optional)
                  </label>
                  <textarea
                    className="govuk-textarea"
                    id="task-description"
                    name="description"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div className="govuk-form-group">
                  <label className="govuk-label" htmlFor="task-priority">
                    Priority
                  </label>
                  <select
                    className="govuk-select"
                    id="task-priority"
                    name="priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  >
                    {TASK_PRIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {taskPriorityLabel(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="govuk-form-group">
                  <label className="govuk-label" htmlFor="task-due-on">
                    Due date (optional)
                  </label>
                  <input
                    className="govuk-input govuk-input--width-10"
                    id="task-due-on"
                    name="due_on"
                    type="date"
                    value={dueOn}
                    onChange={(event) => setDueOn(event.target.value)}
                  />
                </div>
                <p className="govuk-hint">New tasks are assigned to the Deputy account automatically.</p>
                <button type="submit" className="govuk-button" disabled={creating || !title.trim()}>
                  {creating ? "Creating…" : "Create and delegate"}
                </button>
                <button
                  type="button"
                  className="govuk-button govuk-button--secondary govuk-!-margin-left-2"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </fieldset>
            </form>
          )}
        </div>
      )}

      <div className="govuk-form-group">
        <label className="govuk-label" htmlFor="task-status-filter">
          Filter by status
        </label>
        <select
          className="govuk-select"
          id="task-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>
      <div className="govuk-checkboxes govuk-checkboxes--small govuk-!-margin-bottom-6">
        <div className="govuk-checkboxes__item">
          <input
            className="govuk-checkboxes__input"
            id="task-overdue-filter"
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => setOverdueFilter(event.target.checked)}
          />
          <label className="govuk-label govuk-checkboxes__label" htmlFor="task-overdue-filter">
            Overdue only
          </label>
        </div>
      </div>

      {loading ? (
        <p className="govuk-body">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="govuk-body">No tasks match these filters.</p>
      ) : (
        <table className="govuk-table">
          <caption className="govuk-table__caption govuk-table__caption--m">Task list</caption>
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Title
              </th>
              <th scope="col" className="govuk-table__header">
                Status
              </th>
              <th scope="col" className="govuk-table__header">
                Priority
              </th>
              <th scope="col" className="govuk-table__header">
                Assignee
              </th>
              <th scope="col" className="govuk-table__header">
                Due
              </th>
              {canManage && (
                <th scope="col" className="govuk-table__header">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {tasks.map((task) => (
              <tr key={task.id} className="govuk-table__row">
                <td className="govuk-table__cell">
                  <TaskTitleLink task={task} />
                  {task.overdue && (
                    <strong className="govuk-tag govuk-tag--red govuk-!-margin-left-2">Overdue</strong>
                  )}
                </td>
                <td className="govuk-table__cell">
                  <TaskStatusTag status={task.status} />
                </td>
                <td className="govuk-table__cell">{taskPriorityLabel(task.priority)}</td>
                <td className="govuk-table__cell">{task.assigned_to.display_name}</td>
                <td className="govuk-table__cell">{formatTaskDate(task.due_on)}</td>
                {canManage && (
                  <td className="govuk-table__cell">
                    {task.status !== "cancelled" && task.status !== "done" && (
                      <button
                        type="button"
                        className="govuk-link govuk-body govuk-!-margin-bottom-0"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        onClick={() => void handleCancel(task)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {completedWithNotes.length > 0 && (
        <section className="govuk-!-margin-top-8">
          <h2 className="govuk-heading-m">Completed with outcomes</h2>
          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Task
                </th>
                <th scope="col" className="govuk-table__header">
                  Completed
                </th>
                <th scope="col" className="govuk-table__header">
                  Report notes
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {completedWithNotes.map((task) => (
                <tr key={`done-${task.id}`} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <Link to={`/tasks/${task.id}`} className="govuk-link">
                      {task.title}
                    </Link>
                  </td>
                  <td className="govuk-table__cell">{formatTaskDate(task.completed_at)}</td>
                  <td className="govuk-table__cell">{task.report_notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
