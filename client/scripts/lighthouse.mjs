// Mobile Lighthouse run for the main pages. Usage (site on :3100, API on :4000):
//   node scripts/lighthouse.mjs [baseUrl]
// Needs Chrome (CHROME_PATH) and `npx lighthouse`. Writes docs/lighthouse/*.json summaries.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:3100';
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const slug = await fetch('http://localhost:4000/api/v1/properties?limit=1')
  .then((r) => r.json())
  .then((j) => j.data[0].slug);

const pages = {
  home: '/',
  listings: '/listings',
  detail: `/listings/${slug}`,
  contact: '/contact',
};
const out = path.resolve(import.meta.dirname, '../../docs/lighthouse');
mkdirSync(out, { recursive: true });

const rows = [];
for (const [name, p] of Object.entries(pages)) {
  const file = path.join(tmpdir(), `lh-${name}.json`);
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      '--yes',
      'lighthouse',
      base + p,
      '--output=json',
      `--output-path=${file}`,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--only-categories=performance,accessibility,best-practices,seo',
    ],
    {
      env: { ...process.env, CHROME_PATH: chrome },
      stdio: 'ignore',
      shell: process.platform === 'win32',
    },
  );
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const c = r.categories;
  const a = r.audits;
  const row = {
    page: p,
    performance: Math.round(c.performance.score * 100),
    accessibility: Math.round(c.accessibility.score * 100),
    bestPractices: Math.round(c['best-practices'].score * 100),
    seo: Math.round(c.seo.score * 100),
    lcpMs: Math.round(a['largest-contentful-paint'].numericValue),
    cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)),
    tbtMs: Math.round(a['total-blocking-time'].numericValue),
    failing: Object.values(a)
      .filter(
        (x) =>
          x.score !== null &&
          x.score < 0.9 &&
          x.scoreDisplayMode !== 'notApplicable' &&
          x.scoreDisplayMode !== 'informative',
      )
      .map((x) => `${x.id}: ${x.score}`),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
writeFileSync(path.join(out, 'summary.json'), JSON.stringify(rows, null, 2));
