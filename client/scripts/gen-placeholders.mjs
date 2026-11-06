// Generates PLACEHOLDER "photos" (abstract facades) so the UI can be reviewed before real photography
// exists. Run: node scripts/gen-placeholders.mjs   -> public/placeholders/*.svg
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/placeholders/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const PALETTES = [
  {
    sky: ['#e9e1d2', '#f5f1ea'],
    wall: '#1f3d36',
    wall2: '#2d5248',
    glass: '#d8cfb9',
    ground: '#cfc6b3',
  },
  {
    sky: ['#dfe5df', '#f3f1ea'],
    wall: '#8a7350',
    wall2: '#a08a63',
    glass: '#f1ead9',
    ground: '#c9c1ae',
  },
  {
    sky: ['#ece3d3', '#f8f5ee'],
    wall: '#3b4a47',
    wall2: '#52635f',
    glass: '#e4dccb',
    ground: '#d2cab7',
  },
  {
    sky: ['#e2dccf', '#f4efe6'],
    wall: '#6b5020',
    wall2: '#836733',
    glass: '#efe6d0',
    ground: '#c8bfa9',
  },
  {
    sky: ['#e6ebe7', '#f6f3ec'],
    wall: '#14181b',
    wall2: '#2a3135',
    glass: '#d6d0c0',
    ground: '#cdc5b2',
  },
  {
    sky: ['#eadfce', '#f7f2e8'],
    wall: '#4a5250',
    wall2: '#5e6866',
    glass: '#ece3cf',
    ground: '#d0c7b3',
  },
];

function rng(seed) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function building(p, x, w, h, r, W, H, groundY) {
  const top = groundY - h;
  let out = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${p.wall}"/>`;
  out += `<rect x="${x}" y="${top}" width="${w * 0.12}" height="${h}" fill="${p.wall2}"/>`;
  const cols = Math.max(2, Math.floor(w / 70));
  const rows = Math.max(2, Math.floor(h / 80));
  const cw = (w - 40) / cols;
  const rh = (h - 50) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lit = r() > 0.35;
      out += `<rect x="${x + 20 + i * cw + 6}" y="${top + 24 + j * rh + 6}" width="${cw - 16}" height="${rh - 22}" fill="${p.glass}" opacity="${lit ? 0.92 : 0.5}"/>`;
    }
  }
  return out;
}

function scene(i, W, H) {
  const p = PALETTES[i % PALETTES.length];
  const r = rng(i * 97 + 13);
  const groundY = H * 0.82;
  let body = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>`;
  body += `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
  body += `<circle cx="${W * (0.15 + r() * 0.7)}" cy="${H * 0.2}" r="${H * 0.07}" fill="#f5f1ea" opacity="0.85"/>`;
  const n = 2 + Math.floor(r() * 2);
  let x = W * 0.12;
  for (let k = 0; k < n; k++) {
    const w = W * (0.2 + r() * 0.16);
    const h = H * (0.38 + r() * 0.3);
    body += building(p, x, w, h, r, W, H, groundY);
    x += w + W * 0.03;
  }
  body += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="${p.ground}"/>`;
  return body;
}

const svg = (i, W, H, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">${scene(i, W, H)}</svg>`;

for (let i = 1; i <= 6; i++) {
  writeFileSync(new URL(`sample-${i}.svg`, OUT), svg(i, 1200, 900, 'Placeholder property image'));
}
writeFileSync(new URL('hero-poster.svg', OUT), svg(0, 1600, 900, 'Placeholder hero image'));
console.log('placeholders written');
