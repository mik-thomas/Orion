import { request } from "./http";
import type { Note } from "../types/domain";

export type NotePayload = {
  body?: string;
  author_name?: string | null;
  occurred_at?: string | null;
};

export function listCaseNotes(caseId: number | string) {
  return request<Note[]>(`/api/v1/cases/${encodeURIComponent(String(caseId))}/notes`);
}

export function getNote(id: number | string) {
  return request<Note>(`/api/v1/notes/${encodeURIComponent(String(id))}`);
}

export function createNote(caseId: number | string, note: NotePayload) {
  return request<Note>(`/api/v1/cases/${encodeURIComponent(String(caseId))}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function updateNote(id: number | string, note: NotePayload) {
  return request<Note>(`/api/v1/notes/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export function destroyNote(caseId: number | string, id: number | string) {
  return request<void>(
    `/api/v1/cases/${encodeURIComponent(String(caseId))}/notes/${encodeURIComponent(String(id))}`,
    { method: "DELETE" }
  );
}
