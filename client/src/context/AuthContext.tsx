import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createSession, destroySession, fetchSession } from "../api/sessions";
import { ApiError } from "../api/http";
import { clearDemoDisclaimerDismissal } from "../lib/demoDisclaimer";
import { DEFAULT_ROLE, loadStoredRole, type Role } from "../lib/role";
import {
  clearStoredSession,
  loadStoredSession,
  storeSession,
  type OrionSession,
} from "../lib/session";
import { useRole } from "./RoleContext";

interface AuthContextValue {
  session: OrionSession | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromResponse(
  response: {
    token?: string;
    username: string;
    role: Role;
    display_name?: string;
    names_visible?: boolean;
    real_pii?: boolean;
    roster_access?: boolean;
    pii_roles?: Role[];
  },
  existingToken?: string
): OrionSession {
  const namesVisible = Boolean(response.real_pii ?? response.names_visible);
  return {
    token: response.token ?? existingToken ?? "",
    username: response.username,
    role: response.role,
    displayName: response.display_name || response.username,
    namesVisible,
    rosterAccess: Boolean(response.roster_access ?? namesVisible),
    piiRoles: response.pii_roles?.length ? response.pii_roles : namesVisible ? [response.role] : [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole, setPiiAllowlist } = useRole();
  const [session, setSession] = useState<OrionSession | null>(() => loadStoredSession());
  const [ready, setReady] = useState(false);

  const applySession = useCallback(
    (next: OrionSession | null, options?: { preserveDeveloperPreview?: boolean }) => {
      setSession(next);
      if (next) {
        storeSession(next);
        // Server allowlist of roles that may see real PII; effective view still
        // depends on the current role (Developer preview uses RoleSelector).
        setPiiAllowlist(next.piiRoles);
        if (options?.preserveDeveloperPreview && next.role === "Developer") {
          setRole(loadStoredRole());
        } else {
          setRole(next.role);
        }
      } else {
        clearStoredSession();
        setPiiAllowlist([]);
        setRole(DEFAULT_ROLE);
      }
    },
    [setRole, setPiiAllowlist]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = loadStoredSession();
      if (!stored) {
        if (!cancelled) {
          applySession(null);
          setReady(true);
        }
        return;
      }

      try {
        const status = await fetchSession();
        if (cancelled) return;
        applySession(sessionFromResponse(status, stored.token), { preserveDeveloperPreview: true });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          applySession(null);
        } else {
          applySession(stored, { preserveDeveloperPreview: true });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await createSession(username, password);
      applySession(sessionFromResponse(response));
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await destroySession();
    } catch {
      // Local sign-out still clears the client session.
    }
    clearDemoDisclaimerDismissal();
    applySession(null);
  }, [applySession]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session?.token),
        ready,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
