import { Link } from "react-router-dom";
import type { Task, TaskPriority, TaskStatus } from "../types/domain";

export const TASK_STATUSES: TaskStatus[] = ["open", "in_progress", "done", "cancelled"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function taskPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case "low":
      return "Low";
    case "normal":
      return "Normal";
    case "high":
      return "High";
    default:
      return priority;
  }
}

export function taskStatusTagClass(status: TaskStatus): string {
  switch (status) {
    case "open":
      return "govuk-tag govuk-tag--blue";
    case "in_progress":
      return "govuk-tag govuk-tag--yellow";
    case "done":
      return "govuk-tag govuk-tag--green";
    case "cancelled":
      return "govuk-tag govuk-tag--grey";
    default:
      return "govuk-tag";
  }
}

export function formatTaskDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function TaskStatusTag({ status }: { status: TaskStatus }) {
  return <strong className={taskStatusTagClass(status)}>{taskStatusLabel(status)}</strong>;
}

export function TaskTitleLink({ task }: { task: Task }) {
  return (
    <Link to={`/tasks/${task.id}`} className="govuk-link">
      {task.title}
    </Link>
  );
}
