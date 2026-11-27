import { expect, test } from '@playwright/test';
import { PASSWORD, adminSignIn, newPerson, signUp } from './helpers';

test.describe('critical journeys', () => {
  test('1. visitor browses, filters and opens a listing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^Rent/ }).first().click();
    await expect(page).toHaveURL(/purpose=rent/);

    await page.getByRole('button', { name: 'PG room' }).click();
    await expect(page).toHaveURL(/type=pg/);
    await expect(page.getByRole('heading', { name: /\[SAMPLE\] PG room/ })).toBeVisible();
    // BHK only exists for flats
    await expect(page.getByRole('button', { name: 'Any BHK' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Flat', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Any BHK' })).toBeVisible();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/bhk=2/);

    await page
      .getByRole('link', { name: /\[SAMPLE\] 2 BHK flat for rent/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('2 BHK flat for rent');
  });

  test('2. visitor signs up with consent and registers interest', async ({ page }) => {
    const me = newPerson();
    await page.goto('/listings?purpose=rent&type=flat');
    await page.getByRole('button', { name: 'I am interested' }).first().click();

    // Consent must be ticked to continue.
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Full name').fill(me.name);
    await dialog.getByLabel('Email', { exact: true }).fill(me.email);
    await dialog.getByLabel('Phone', { exact: true }).fill(me.phone);
    await dialog.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await expect(dialog.getByRole('checkbox')).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Create account' }).click();
    await expect(dialog.getByText('Please tick the box to continue')).toBeVisible();

    await signUp(page, me);
    // The interrupted action resumes by itself once signed in.
    await expect(page.getByText('Interest sent').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'My account' }).first()).toBeVisible();
  });

  test('account: interests, consent withdrawal and deletion', async ({ page }) => {
    const me = newPerson();
    await page.goto('/listings?purpose=rent&type=room');
    await page.getByRole('button', { name: 'I am interested' }).first().click();
    await signUp(page, me);
    await expect(page.getByText('Interest sent').first()).toBeVisible();

    await page.getByRole('link', { name: 'My account' }).first().click();
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Furnished room for rent' })).toBeVisible();

    await page.getByRole('button', { name: 'Stop contacting me' }).click();
    await expect(page.getByText('Contact is switched off')).toBeVisible();
    // Withdrawn users cannot register new interest.
    await page.goto('/listings?purpose=rent&type=pg');
    await page.getByRole('button', { name: 'I am interested' }).first().click();
    await expect(page.getByText(/consent to be contacted is switched off/i)).toBeVisible();

    await page.goto('/account');
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('You have not shown interest in any property yet.')).toBeVisible();
    await page.getByRole('button', { name: 'Delete my account' }).click();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  });

  test('4. contact form submission succeeds', async ({ page }) => {
    const me = newPerson();
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Enter your full name')).toBeVisible();
    await page.getByLabel('Full name').fill(me.name);
    await page.getByLabel('Phone', { exact: true }).fill(me.phone);
    await page.getByLabel('Email', { exact: true }).fill(me.email);
    await page.getByLabel('How can we help?').fill('I am looking for a 2 BHK flat on rent.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Thank you, we have your message')).toBeVisible();
  });
});

test.describe('layout', () => {
  test('@mobile sticky call/WhatsApp bar and menu work at 360px', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('region', { name: 'Quick contact' });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Call' })).toHaveAttribute('href', /^tel:/);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page
      .getByRole('navigation', { name: 'Mobile' })
      .getByRole('link', { name: 'Contact' })
      .click();
    await expect(page).toHaveURL(/\/contact/);
    // no horizontal scroll
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('keyboard: skip link and visible focus', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });
});

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test('3. admin creates a listing with a photo, sees the new lead and interest, updates status and exports CSV', async ({
  page,
  browser,
}) => {
  const title = `E2E Shop ${Date.now()}`;

  // Admin signs in and creates a listing.
  await adminSignIn(page);

  await page.goto('/admin/listings/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Property type').selectOption('shop');
  await expect(page.getByLabel('BHK')).toHaveCount(0); // BHK is for flats only
  await page.getByLabel('Property type').selectOption('flat');
  await page.getByRole('button', { name: 'Create listing' }).click();
  await expect(page.getByText('Choose the BHK')).toBeVisible();
  await page.getByLabel('Property type').selectOption('shop');
  await page.getByLabel(/Price in rupees/).fill('30000');
  await page.getByLabel('Price is').selectOption('per-month');
  await page.getByLabel('City').fill('Sample City');
  await page.getByRole('button', { name: 'Create listing' }).click();
  await expect(page).toHaveURL(/\/admin\/listings\/[0-9a-f]{24}$/);

  await page
    .locator('#photo-input')
    .setInputFiles({ name: 'shop.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('heading', { name: 'Photos (1)' })).toBeVisible();

  // A visitor registers interest in it.
  const visitorCtx = await browser.newContext();
  const visitor = await visitorCtx.newPage();
  const me = newPerson();
  await visitor.goto(`/listings?q=${encodeURIComponent(title.split(' ').slice(0, 3).join(' '))}`);
  const card = visitor.locator('article', { hasText: title });
  await card.getByRole('button', { name: 'I am interested' }).click();
  await signUp(visitor, me);
  await expect(visitor.getByText('Interest sent').first()).toBeVisible();
  await visitorCtx.close();

  // Admin sees the lead and the interest, and updates the status.
  await page.goto('/admin/leads');
  const row = page.getByRole('row', { name: new RegExp(me.name) });
  await expect(row).toBeVisible();
  await row.getByRole('combobox').selectOption('contacted');
  await expect(page.getByText('Status updated.')).toBeVisible();
  await page.goto('/admin/interests');
  await expect(page.getByRole('row', { name: new RegExp(me.name) })).toBeVisible();

  // CSV export includes the lead and requires the admin session.
  const csv = await page.request.get('http://localhost:4000/api/v1/admin/export/leads.csv');
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(me.email);
  const anon = await browser.newContext();
  expect(
    (await anon.request.get('http://localhost:4000/api/v1/admin/export/leads.csv')).status(),
  ).toBe(401);
  await anon.close();
});
