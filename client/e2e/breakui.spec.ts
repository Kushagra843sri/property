import { expect, test } from '@playwright/test';

// break-ui: the realistic worst case for every field a listing renders (limits from the API schema:
// title 140, description 5000, locality 100, amenity 60) must not break layout at 320px.
const API = 'http://localhost:4000/api/v1';
const LONG_WORD = 'Superlongunbrokennamewithoutanyspaces'.repeat(2); // 74 chars, no break opportunity

test('worst-case listing does not overflow cards or the detail page at 320px', async ({
  page,
  context,
}) => {
  const login = await context.request.post(`${API}/auth/login`, {
    data: { email: 'admin@example.com', password: 'demo-admin-passphrase-1' },
  });
  expect(login.ok()).toBe(true);
  const csrf = (await context.cookies()).find((c) => c.name === 'csrf_token')!.value;
  const headers = { 'X-CSRF-Token': decodeURIComponent(csrf) };

  const title = `BreakUI ${LONG_WORD} ${'Spacious bungalow '.repeat(5)}`.slice(0, 140);
  const created = await context.request.post(`${API}/admin/properties`, {
    headers,
    data: {
      title,
      type: 'villa',
      purpose: 'buy',
      price: 999_999_999,
      description: 'W'.repeat(300) + ' ' + 'A very long description sentence. '.repeat(40),
      address: { city: 'C'.repeat(60), locality: 'L'.repeat(80), line: 'x'.repeat(100) },
      amenities: ['Z'.repeat(58), 'Swimming pool with heated water and a long name'],
      furnishing: 'furnished',
      carpetArea: 123456789,
    },
  });
  expect(created.status()).toBe(201);
  const { id, slug } = (await created.json()).data;

  try {
    await page.setViewportSize({ width: 320, height: 640 });
    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    await page.goto(`/listings?q=BreakUI`);
    const card = page.locator('article', { hasText: 'BreakUI' });
    await expect(card).toBeVisible();
    const box = (await card.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(320 + 1);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await expect(card.getByRole('img', { name: /no photo available/ })).toBeVisible(); // missing image fallback
    await expect(card.getByText('₹100 crore')).toBeVisible();

    await page.goto(`/listings/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  } finally {
    await context.request.delete(`${API}/admin/properties/${id}`, { headers });
  }
});

test('empty results look intentional', async ({ page }) => {
  await page.goto('/listings?q=zzzzzzzznothingmatches');
  await expect(page.getByText('No properties match these filters')).toBeVisible();
});
