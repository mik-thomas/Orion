const STORAGE_KEY = "orion-open-tasks-reminder-dismissed";

export function isOpenTasksReminderDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissOpenTasksReminder(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // sessionStorage unavailable
  }
}

export function clearOpenTasksReminderDismissal(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable
  }
}
