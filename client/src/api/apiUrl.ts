/** API base URL (no trailing slash). Dev uses Vite proxy when unset. */
export function apiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (import.meta.env.DEV) return "";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("railway.app")) {
      if (host.includes("orion-client")) {
        return "https://orion-production-7f9f.up.railway.app";
      }
      const apiHost = host.replace("-client", "");
      return `${window.location.protocol}//${apiHost}`;
    }
  }

  return "https://orion-production-7f9f.up.railway.app";
}
