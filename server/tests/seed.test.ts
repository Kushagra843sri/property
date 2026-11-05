import { describe, expect, it } from 'vitest';
import { useTestDb, signUpAndLogin } from './helpers.js';
import { runSeed } from '../src/seed.js';
import { User } from '../src/models/user.js';
import { Property } from '../src/models/property.js';
import { verifyPassword } from '../src/utils/password.js';

useTestDb();

describe('seed', () => {
  it('creates a hashed admin and fake sample listings, idempotently', async () => {
    await runSeed('Owner@Example.com', 'a-very-long-admin-pass-1');
    await runSeed('owner@example.com', 'a-very-long-admin-pass-1');
    const admins = await User.find({ role: 'admin' }).select('+passwordHash');
    expect(admins).toHaveLength(1);
    expect(admins[0]!.passwordHash).not.toContain('a-very-long');
    expect(await verifyPassword(admins[0]!.passwordHash!, 'a-very-long-admin-pass-1')).toBe(true);
    const props = await Property.find();
    expect(props.length).toBeGreaterThan(0);
    expect(props.every((p) => p.title.startsWith('[SAMPLE]'))).toBe(true);
  });

  it('rejects weak passwords and refuses to promote a normal user', async () => {
    await expect(runSeed('a@example.com', 'short')).rejects.toThrow(/rejected/);
    await expect(runSeed('a@example.com', 'changeme1234')).rejects.toThrow(/common/);
    const { user } = await signUpAndLogin();
    await expect(runSeed(user.email, 'a-very-long-admin-pass-1')).rejects.toThrow(/refusing/);
    expect(await User.countDocuments({ role: 'admin' })).toBe(0);
  });
});
