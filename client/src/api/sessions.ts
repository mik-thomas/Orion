import { request } from "./http";
import type { Role } from "../lib/role";

export interface SessionResponse {
  token: string;
  username: string;
  role: Role;
  display_name: string;
}

export interface SessionStatusResponse {
  username: string;
  role: Role;
}

export async function createSession(username: string, password: string): Promise<SessionResponse> {
  return request<SessionResponse>("/api/v1/session", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchSession(): Promise<SessionStatusResponse> {
  return request<SessionStatusResponse>("/api/v1/session");
}

export async function destroySession(): Promise<void> {
  await request<void>("/api/v1/session", { method: "DELETE" });
}
