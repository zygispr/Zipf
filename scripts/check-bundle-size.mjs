// Initial-JS budget (plan Performance Goals): the gzipped JavaScript that index.html loads must
// stay at or under 150 KB. Run after `npm run build`.
//
// The analysis worker is inlined into the entry chunk (it starts from a blob: URL so analyzing a
// book makes no network request, research R2), so it is counted here too.
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const BUDGET_BYTES = 150_000;

const html = await readFile(join(DIST, 'index.html'), 'utf8');
// Entry scripts and their modulepreloaded imports; the base path (e.g. /Zipf/) is ignored.
const scripts = [
  ...html.matchAll(/<script[^>]*\ssrc="([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"/g),
].map(([, src]) => join(DIST, 'assets', basename(src)));

if (scripts.length === 0) {
  console.error(`No scripts found in ${DIST}/index.html. Run \`npm run build\` first.`);
  process.exit(1);
}

let total = 0;
for (const path of scripts) {
  const size = gzipSync(await readFile(path)).length;
  total += size;
  console.log(`${path}: ${(size / 1000).toFixed(1)} KB gzipped`);
}

const summary = `Initial JS: ${(total / 1000).toFixed(1)} KB gzipped (budget ${String(BUDGET_BYTES / 1000)} KB)`;
if (total > BUDGET_BYTES) {
  console.error(`${summary}. Over budget.`);
  process.exit(1);
}
console.log(summary);
