import { request } from "./http";
import type { Task, TaskListResponse, TaskStatus, TaskSummary } from "../types/domain";

export type TaskFilters = {
  status?: TaskStatus | "";
  assigned_to_user_id?: number | "";
  overdue?: boolean;
  completed_from?: string;
  completed_to?: string;
};

function toQuery(filters?: TaskFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assigned_to_user_id) params.set("assigned_to_user_id", String(filters.assigned_to_user_id));
  if (filters.overdue) params.set("overdue", "true");
  if (filters.completed_from) params.set("completed_from", filters.completed_from);
  if (filters.completed_to) params.set("completed_to", filters.completed_to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function listTasks(filters?: TaskFilters) {
  return request<TaskListResponse>(`/api/v1/tasks${toQuery(filters)}`);
}

export function getTaskSummary() {
  return request<TaskSummary>("/api/v1/tasks/summary");
}

export function getTask(id: number | string) {
  return request<Task>(`/api/v1/tasks/${encodeURIComponent(String(id))}`);
}

export type TaskPayload = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: "low" | "normal" | "high";
  due_on?: string | null;
  reminder_on?: string | null;
  assigned_to_user_id?: number;
  report_notes?: string | null;
  case_id?: number | null;
  note_id?: number | null;
  magistrate_id?: number | null;
};

export function createTask(task: TaskPayload) {
  return request<Task>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify({ task }),
  });
}

export function updateTask(id: number | string, task: TaskPayload) {
  return request<Task>(`/api/v1/tasks/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify({ task }),
  });
}

export function cancelTask(id: number | string) {
  return request<Task>(`/api/v1/tasks/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}
