export function getDefaultMovementDate(selectedMonth: string, today: string): string {
  return selectedMonth === today.slice(0, 7) ? today : `${selectedMonth}-01`;
}
