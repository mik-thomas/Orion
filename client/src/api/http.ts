import { apiUrl } from "./apiUrl";
import { loadStoredRole } from "../lib/role";
import { loadStoredSession } from "../lib/session";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const session = loadStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Orion-Role": session?.role ?? loadStoredRole(),
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (session?.token) {
    headers["X-Orion-Session"] = session.token;
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      cache: "no-store",
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the API. Run npm run dev from the project root.",
      0
    );
  }

  const body = await response.json().catch(() => ({} as Record<string, unknown>));
  const bodyMessage = () => {
    if (Array.isArray(body.errors)) return (body.errors as string[]).join(", ");
    if (typeof body.error === "string") return body.error;
    return undefined;
  };

  if (!response.ok) {
    throw new ApiError(bodyMessage() ?? response.statusText ?? "Request failed", response.status);
  }

  if (response.status === 204) return undefined as T;
  return body as T;
}
