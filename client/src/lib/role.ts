export type Role = "HMCTS-SLM" | "Developer" | "Bench Chair" | "Deputy";

export const ROLES: Role[] = ["HMCTS-SLM", "Developer", "Bench Chair", "Deputy"];

export const DEFAULT_ROLE: Role = "Deputy";

export const STORAGE_KEY = "orion-role";

export function canViewNames(role: Role): boolean {
  return role === "HMCTS-SLM" || role === "Developer";
}

export function canViewRoster(role: Role): boolean {
  return canViewNames(role);
}

export function loadStoredRole(): Role {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ROLES.includes(stored as Role)) {
      return stored as Role;
    }
  } catch {
    // localStorage unavailable (SSR/tests)
  }
  return DEFAULT_ROLE;
}

export function magistrateLabel(magistrate: { display_name: string }): string {
  return magistrate.display_name;
}
