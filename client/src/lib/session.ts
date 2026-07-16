import type { Role } from "./role";
import { ROLES } from "./role";

export const SESSION_STORAGE_KEY = "orion-session";

export interface OrionSession {
  token: string;
  username: string;
  role: Role;
  displayName: string;
}

export function loadStoredSession(): OrionSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrionSession>;
    if (
      typeof parsed.token !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.role !== "string" ||
      !ROLES.includes(parsed.role as Role)
    ) {
      return null;
    }
    return {
      token: parsed.token,
      username: parsed.username,
      role: parsed.role as Role,
      displayName:
        typeof parsed.displayName === "string" && parsed.displayName
          ? parsed.displayName
          : parsed.username,
    };
  } catch {
    return null;
  }
}

export function storeSession(session: OrionSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
