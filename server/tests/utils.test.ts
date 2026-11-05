import { describe, expect, it } from 'vitest';
import { normalizePhone, maskEmail, maskPhone } from '../src/utils/phone.js';
import { csvCell, csvRow } from '../src/utils/csv.js';
import { sniffImage } from '../src/utils/imageSniff.js';
import { passwordProblem, hashPassword, verifyPassword } from '../src/utils/password.js';
import { slugify } from '../src/modules/properties/service.js';
import { generateOtp } from '../src/utils/otp.js';

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['+14155552671', '+14155552671'],
  ])('normalizes %s', (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(['', '12345', 'abcdefghij', '5876543210', '+0123456789', '++9198765432'])(
    'rejects %j',
    (input) => expect(normalizePhone(input)).toBeNull(),
  );
});

describe('masking', () => {
  it('masks phones and emails', () => {
    expect(maskPhone('+919876543210')).toBe('+91****10');
    expect(maskEmail('someone@example.com')).toBe('s***@example.com');
  });
});

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
  it('neutralises formula injection but leaves numbers and phones alone', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('+919876543210')).toBe('+919876543210');
    expect(csvCell('-5')).toBe('-5');
  });
  it('writes dates as ISO and nulls as empty', () => {
    expect(csvRow([null, new Date('2025-01-02T03:04:05Z'), 3])).toBe(
      ',2025-01-02T03:04:05.000Z,3\r\n',
    );
  });
});

describe('sniffImage', () => {
  it('recognises real signatures and rejects spoofed content', () => {
    const pad = Buffer.alloc(16);
    expect(sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), pad]))).toBe('jpeg');
    expect(
      sniffImage(
        Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pad]),
      ),
    ).toBe('png');
    expect(sniffImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffImage(Buffer.from('GIF89a......................'))).toBeNull();
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(Buffer.alloc(3))).toBeNull();
  });
});

describe('password policy', () => {
  it('enforces length, common-password and personal-info rules', () => {
    expect(passwordProblem('short')).toMatch(/at least/);
    expect(passwordProblem('Password123')).toMatch(/at least/);
    expect(passwordProblem('changeme1234')).toMatch(/common/);
    expect(passwordProblem('aaaaaaaaaaaaaa')).toMatch(/common/);
    expect(passwordProblem('myadmin@example.com-pass', 'myadmin@example.com')).toMatch(
      /name or email/,
    );
    expect(passwordProblem('a-long-unusual-passphrase')).toBeNull();
  });
  it('hashes with argon2id and verifies', async () => {
    const h = await hashPassword('a-long-unusual-passphrase');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, 'a-long-unusual-passphrase')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('misc', () => {
  it('slugifies titles safely', () => {
    expect(slugify('Sunrise Heights — 3 BHK!')).toBe('sunrise-heights-3-bhk');
    expect(slugify('!!!')).toBe('property');
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });
  it('generates 6-digit zero-padded OTPs', () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
});
