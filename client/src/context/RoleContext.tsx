import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  DEFAULT_ROLE,
  loadStoredRole,
  STORAGE_KEY,
  canViewNames,
  canViewRoster,
  type Role,
} from "../lib/role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  canViewNames: boolean;
  canViewRoster: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => loadStoredRole());

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("orion-role-change", { detail: next }));
  }, []);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        canViewNames: canViewNames(role),
        canViewRoster: canViewRoster(role),
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    return {
      role: DEFAULT_ROLE,
      setRole: () => {},
      canViewNames: false,
      canViewRoster: false,
    };
  }
  return context;
}

export function subscribeToRoleChanges(listener: () => void) {
  window.addEventListener("orion-role-change", listener);
  return () => window.removeEventListener("orion-role-change", listener);
}
