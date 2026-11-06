// WCAG 2.x contrast check for the design tokens. Usage: node scripts/contrast.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TEXT = 4.5;
const UI = 3;

// [foreground token, background token, minimum ratio, what it is used for]
export const PAIRS = [
  ['ink', 'paper', TEXT, 'body text'],
  ['ink', 'paper-raised', TEXT, 'text on raised surfaces'],
  ['ink', 'paper-sunken', TEXT, 'text on sunken surfaces'],
  ['ink-muted', 'paper', TEXT, 'secondary text'],
  ['ink-muted', 'paper-raised', TEXT, 'secondary text on raised'],
  ['ink-muted', 'paper-sunken', TEXT, 'secondary text on sunken'],
  ['forest', 'paper', TEXT, 'links and accents as text'],
  ['forest', 'paper-raised', TEXT, 'links on raised'],
  ['brass-ink', 'paper', TEXT, 'brass used as text'],
  ['brass-ink', 'paper-sunken', TEXT, 'brass text on sunken'],
  ['on-forest', 'forest', TEXT, 'primary button text'],
  ['on-forest', 'forest-hover', TEXT, 'primary button hover text'],
  ['success', 'success-bg', TEXT, 'success message'],
  ['warn', 'warn-bg', TEXT, 'warning message'],
  ['error', 'error-bg', TEXT, 'error message'],
  ['error', 'paper', TEXT, 'inline error text'],
  ['success', 'paper', TEXT, 'inline success text'],
  ['warn', 'paper', TEXT, 'inline warning text'],
  ['focus', 'paper', UI, 'focus ring'],
  ['focus', 'paper-sunken', UI, 'focus ring on sunken'],
  ['line-strong', 'paper', UI, 'input borders'],
  ['line-strong', 'paper-raised', UI, 'input borders on raised'],
  ['forest', 'paper', UI, 'button / control boundary'],
];

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readTokens(css) {
  const out = {};
  for (const m of css.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}

export function checkContrast(css) {
  const t = readTokens(css);
  return PAIRS.map(([fg, bg, min, use]) => {
    if (!t[fg] || !t[bg]) return { fg, bg, min, use, ratio: 0, pass: false, missing: true };
    const r = ratio(t[fg], t[bg]);
    return { fg, bg, min, use, ratio: Math.round(r * 100) / 100, pass: r >= min };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const results = checkContrast(css);
  for (const r of results) {
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'}  ${String(r.ratio).padEnd(5)} (min ${r.min})  ${r.fg} on ${r.bg}  - ${r.use}`,
    );
  }
  const failed = results.filter((r) => !r.pass);
  console.log(failed.length ? `\n${failed.length} failing pair(s)` : '\nAll pairs pass WCAG AA');
  process.exit(failed.length ? 1 : 0);
}
