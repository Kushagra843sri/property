/** Escape a CSV cell, neutralising spreadsheet formula injection (=, +, -, @, tab, CR). */
export function csvCell(value: unknown): string {
  let s = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (header: string[], rows: unknown[][]): string =>
  [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
