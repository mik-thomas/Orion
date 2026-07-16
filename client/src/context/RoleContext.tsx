import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  DEFAULT_ROLE,
  loadStoredRole,
  STORAGE_KEY,
  type Role,
} from "../lib/role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  setPiiAllowlist: (roles: Role[]) => void;
  canViewNames: boolean;
  canViewRoster: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => loadStoredRole());
  const [piiAllowlist, setPiiAllowlistState] = useState<Role[]>([]);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("orion-role-change", { detail: next }));
  }, []);

  const setPiiAllowlist = useCallback((roles: Role[]) => {
    setPiiAllowlistState(roles);
  }, []);

  const canView = piiAllowlist.includes(role);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        setPiiAllowlist,
        canViewNames: canView,
        canViewRoster: canView,
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
      setPiiAllowlist: () => {},
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
