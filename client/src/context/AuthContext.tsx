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
import { DEFAULT_ROLE } from "../lib/role";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useRole();
  const [session, setSession] = useState<OrionSession | null>(() => loadStoredSession());
  const [ready, setReady] = useState(false);

  const applySession = useCallback(
    (next: OrionSession | null) => {
      setSession(next);
      if (next) {
        storeSession(next);
        setRole(next.role);
      } else {
        clearStoredSession();
        setRole(DEFAULT_ROLE);
      }
    },
    [setRole]
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
        applySession({
          ...stored,
          username: status.username,
          role: status.role,
        });
      } catch (error) {
        if (cancelled) return;
        // Keep a freshly issued local session if the network is briefly down.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          applySession(null);
        } else {
          applySession(stored);
          setRole(stored.role);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applySession, setRole]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await createSession(username, password);
      applySession({
        token: response.token,
        username: response.username,
        role: response.role,
        displayName: response.display_name,
      });
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await destroySession();
    } catch {
      // Local sign-out still clears the client session.
    }
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
