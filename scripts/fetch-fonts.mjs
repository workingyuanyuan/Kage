// Fetch Google's frequency-split Noto Serif TC woff2 subsets and self-host them.
// Rewrites the @font-face src URLs to relative paths.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2];
const CSS = process.argv[3];

const css = await readFile(CSS, 'utf8');
await mkdir(join(OUT, 'files'), { recursive: true });

const faceRe = /@font-face\s*\{[\s\S]*?\}/g;
const faces = css.match(faceRe) ?? [];
console.log(`faces: ${faces.length}`);

const jobs = [];
for (const face of faces) {
  const weight = /font-weight:\s*(\d+)/.exec(face)?.[1];
  const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(face)?.[1];
  if (!weight || !url) continue;
  // Most subsets carry a numeric index; the Latin/Cyrillic/Greek ones do not.
  const idx = /\.(\d+)\.woff2$/.exec(url)?.[1] ?? `x${/([A-Za-z0-9]{8})\.woff2$/.exec(url)[1]}`;
  const name = `noto-serif-tc-${weight}-${idx}.woff2`;
  jobs.push({ face, url, name });
}

let done = 0, bytes = 0;
const CONC = 12;
async function worker(queue) {
  while (queue.length) {
    const j = queue.shift();
    const res = await fetch(j.url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!res.ok) throw new Error(`${res.status} ${j.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(OUT, 'files', j.name), buf);
    bytes += buf.length; done++;
    if (done % 40 === 0) console.log(`  ${done}/${jobs.length}`);
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: CONC }, () => worker(queue)));

let out = `/* Noto Serif TC — self-hosted, frequency-split subsets.
   Source: Google Fonts (fonts.gstatic.com), SIL Open Font License 1.1.
   ${jobs.length} subset files; the browser downloads only the ranges a page
   actually uses. Do not hand-edit — regenerate with scripts/fetch-fonts.mjs. */\n\n`;
for (const j of jobs) {
  out += j.face.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(./files/${j.name})`) + '\n';
}
await writeFile(join(OUT, 'noto-serif-tc.css'), out, 'utf8');

console.log(`\ndone: ${done} files, ${(bytes / 1048576).toFixed(2)} MB`);
