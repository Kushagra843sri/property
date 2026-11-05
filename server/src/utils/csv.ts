/**
 * Escape a CSV cell. Text starting with =, +, -, @, tab or CR is prefixed with ' so spreadsheets
 * never evaluate it as a formula; plain numbers (e.g. +919876543210) are exempt because they can't
 * execute anything.
 */
export function csvCell(value: unknown): string {
  let s = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvRow = (cells: unknown[]): string => cells.map(csvCell).join(',') + '\r\n';
