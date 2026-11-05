/**
 * Normalize to E.164. Bare 10-digit Indian mobiles (6-9 prefix) get +91; anything else must
 * already be `+<country><number>`. Returns null when it cannot be a phone number.
 */
export function normalizePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s().-]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^0[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  return null;
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export const maskPhone = (p: string) =>
  p.length > 6 ? `${p.slice(0, 3)}****${p.slice(-2)}` : '****';
export const maskEmail = (e: string) => {
  const [u = '', d = ''] = e.split('@');
  return `${u.slice(0, 1)}***@${d}`;
};
