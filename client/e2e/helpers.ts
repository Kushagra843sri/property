import type { Page } from '@playwright/test';

const OUTBOX = 'http://127.0.0.1:4001/outbox';

/** Password used by every E2E visitor (the emailed code is still what verifies the account). */
export const PASSWORD = 'e2e visitor passphrase 1';

let n = 0;
/** A unique person per call, so tests never collide in the shared in-memory database. */
export function newPerson() {
  n += 1;
  const stamp = `${Date.now()}${n}`;
  return {
    name: `E2E Visitor ${stamp}`,
    email: `e2e.${stamp}@example.com`,
    phone: `9${stamp.slice(-9).padStart(9, '1')}`,
  };
}

/** Read the most recent one-time code sent to an address from the dev outbox. */
export async function latestCode(to: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(OUTBOX);
    const { mail } = (await res.json()) as { mail: { to: string; text: string }[] };
    const m = [...mail].reverse().find((x) => x.to === to);
    const code = m?.text.match(/(\d{6})/)?.[1];
    if (code) return code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no code arrived for ${to}`);
}

export async function signUp(page: Page, person: ReturnType<typeof newPerson>) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill(person.name);
  await dialog.getByLabel('Email', { exact: true }).fill(person.email);
  await dialog.getByLabel('Phone', { exact: true }).fill(person.phone);
  await dialog.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await dialog.getByLabel('6-digit code').fill(await latestCode(person.email));
  await dialog.getByRole('button', { name: 'Verify and continue' }).click();
}

/** Admin signs in through the normal Sign in dialog (admins have no separate login). */
export async function adminSignIn(page: Page) {
  await page.goto('/admin');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill('admin@example.com');
  await dialog.getByLabel('Password', { exact: true }).fill('demo-admin-passphrase-1');
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
}
