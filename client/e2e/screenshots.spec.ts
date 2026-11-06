import { test } from '@playwright/test';
import path from 'node:path';

// Not an assertion test: captures key pages for docs/screenshots (run with `npm run e2e -- screenshots`).
const OUT = path.resolve(__dirname, '../../docs/screenshots');
// Scroll through the page so scroll-reveal sections are visible in full-page captures.
async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
}

const PAGES = [
  ['home', '/'],
  ['listings', '/listings'],
  ['listings-rent-pg', '/listings?purpose=rent&type=pg'],
  ['contact', '/contact'],
  ['about', '/about'],
];

for (const [width, height] of [
  [1280, 800],
  [360, 740],
] as const) {
  test.describe(`screenshots ${width}`, () => {
    test.use({ viewport: { width, height } });
    for (const [name, url] of PAGES) {
      test(`${name} @${width}`, async ({ page }) => {
        await page.goto(url!);
        await page.waitForLoadState('networkidle');
        await settle(page);
        await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`), fullPage: true });
      });
    }
    test(`detail @${width}`, async ({ page }) => {
      await page.goto('/listings');
      await page
        .getByRole('link', { name: /\[SAMPLE\]/ })
        .first()
        .click();
      await page.waitForLoadState('networkidle');
      await settle(page);
      await page.screenshot({ path: path.join(OUT, `detail-${width}.png`), fullPage: true });
    });
  });
}
