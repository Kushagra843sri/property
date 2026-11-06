import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function scan(page: Page, label: string) {
  await page.waitForLoadState('networkidle');
  // Reveal sections are visible only after scrolling; scroll so axe sees final styles.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')}`,
  );
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

const PUBLIC = [
  '/',
  '/listings',
  '/listings?purpose=rent&type=flat&bhk=2',
  '/contact',
  '/about',
  '/privacy',
  '/terms',
  '/account',
  '/does-not-exist',
];

test.describe('axe: public pages', () => {
  for (const url of PUBLIC) {
    test(`${url} @mobile`, async ({ page }) => {
      await page.goto(url);
      await scan(page, url);
    });
    test(`${url}`, async ({ page }) => {
      await page.goto(url);
      await scan(page, url);
    });
  }

  test('property detail', async ({ page }) => {
    await page.goto('/listings');
    await page
      .getByRole('link', { name: /\[SAMPLE\]/ })
      .first()
      .click();
    await scan(page, 'detail');
  });

  test('property detail @mobile', async ({ page }) => {
    await page.goto('/listings');
    await page
      .getByRole('link', { name: /\[SAMPLE\]/ })
      .first()
      .click();
    await scan(page, 'detail mobile');
  });

  test('open gallery lightbox', async ({ page }) => {
    await page.goto('/listings');
    await page
      .getByRole('link', { name: /\[SAMPLE\]/ })
      .first()
      .click();
    await page.getByRole('button', { name: /full screen/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await scan(page, 'lightbox');
  });
});

test.describe('axe: dialogs and keyboard', () => {
  test('auth dialog: scan, focus trap, Escape and focus return', async ({ page }) => {
    await page.goto('/listings');
    const trigger = page.getByRole('button', { name: 'I am interested' }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await scan(page, 'auth dialog');

    // Focus must stay inside the dialog while tabbing through it.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      // body means focus is on the browser chrome (native modal dialogs make the page inert);
      // any other element outside the dialog would be a real trap failure.
      const ok = await page.evaluate(
        () =>
          document.activeElement === document.body || !!document.activeElement?.closest('dialog'),
      );
      expect(ok, `Tab #${i + 1} moved focus outside the dialog`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused(); // focus returns to where the user was
  });

  test('sign-in dialog opens from the header with the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Email or phone')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('every link and button has a visible focus ring on the home page', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const s = el ? getComputedStyle(el) : null;
        return s ? `${s.outlineStyle} ${s.outlineWidth}` : '';
      });
      expect(outline).not.toMatch(/^none|0px/);
    }
  });

  test('mobile menu is keyboard operable @mobile', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: 'Open menu' });
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible();
    await scan(page, 'mobile menu open');
  });
});

test.describe('axe: admin', () => {
  test('login and pages', async ({ page }) => {
    await page.goto('/admin');
    await scan(page, 'admin login');
    await page.getByLabel('Email', { exact: true }).fill('admin@example.com');
    await page.getByLabel('Password').fill('demo-admin-passphrase-1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
    for (const url of [
      '/admin',
      '/admin/listings',
      '/admin/listings/new',
      '/admin/leads',
      '/admin/interests',
      '/admin/enquiries',
    ]) {
      await page.goto(url);
      await page.getByRole('main').waitFor();
      await page.waitForTimeout(500);
      await scan(page, url);
    }
  });
});
