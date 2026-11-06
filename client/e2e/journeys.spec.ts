import { expect, test } from '@playwright/test';
import { newPerson, signUp } from './helpers';

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
    await expect(dialog.getByRole('checkbox')).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Send me a code' }).click();
    await expect(dialog.getByText('Please tick the box to continue')).toBeVisible();

    await signUp(page, me);
    // The interrupted action resumes by itself once signed in.
    await expect(page.getByText('Interest sent').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'My account' }).first()).toBeVisible();
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
