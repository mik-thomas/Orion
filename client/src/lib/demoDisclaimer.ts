const STORAGE_KEY = "orion-demo-disclaimer-dismissed";

export function isDemoDisclaimerDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissDemoDisclaimer(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // sessionStorage unavailable — disclaimer may reappear on navigation
  }
}

/** Clear so the next sign-in shows the disclaimer again. */
export function clearDemoDisclaimerDismissal(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable
  }
}
