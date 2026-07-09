export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isRetiringSoon(retirementOn: string | null | undefined): boolean {
  if (!retirementOn) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const retirement = new Date(`${retirementOn}T00:00:00`);
  const sixMonths = new Date(today);
  sixMonths.setMonth(sixMonths.getMonth() + 6);

  return retirement >= today && retirement <= sixMonths;
}

export function formatUkDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function retirementAlertStorageKey(magistrateId: number): string {
  return `orion-retirement-dismissed-${magistrateId}`;
}

export function isRetirementAlertDismissed(magistrateId: number): boolean {
  try {
    return sessionStorage.getItem(retirementAlertStorageKey(magistrateId)) === "1";
  } catch {
    return false;
  }
}

export function dismissRetirementAlert(magistrateId: number): void {
  try {
    sessionStorage.setItem(retirementAlertStorageKey(magistrateId), "1");
  } catch {
    // sessionStorage unavailable — alert may reappear on navigation
  }
}
