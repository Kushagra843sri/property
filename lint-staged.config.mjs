// Each app has its own eslint install, so run it from inside the app directory.
const q = (f) => f.map((x) => `"${x}"`).join(' ');
const app = (dir) => (files) => [
  `prettier --write ${q(files)}`,
  `npm --prefix ${dir} exec -- eslint --config ${dir}/eslint.config.mjs --fix --no-warn-ignored ${q(files)}`,
];
export default {
  'server/**/*.{ts,mjs}': app('server'),
  'client/**/*.{ts,tsx,mjs}': app('client'),
  '*.{json,md,yml,yaml,css}': (files) => `prettier --write ${q(files)}`,
};
