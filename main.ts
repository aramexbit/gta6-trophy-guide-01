// Leonida Legends — gta6-trophy-guide-01 entry, Node 22, standard library only.
//
// The guide itself is the app/ folder beside this file: plain static files
// (index.html, an ES module, CSS and app/data/trophies.json) with no build step,
// fully offline. It covers all 55 official PS5 trophies — official names,
// descriptions and grades, plus a guide in our own words with cited sources,
// a kind, a missable flag and a roadmap stage per trophy. This program hands
// the guide in: it copies app/ and screenshots/ into the output directory and
// writes /output/dossier.json with the vendored make.fun library, the summary
// the judge reads. vendor/makefun-frontend.ts is the kit's file — leave it alone:
// the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Run it locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output.)

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// Refuse to hand in an entry the sealed scorer would refuse: more than four
// screenshots, one over 256 KiB, or an app/ over the file and byte caps. Only
// the text cap shapes the dossier bytes; the rest are guard rails.
const shots = existsSync(shotsDir) ? readdirSync(shotsDir) : [];
if (shots.length > 4) throw new Error(`too many screenshots: ${shots.length} (max 4)`);
for (const file of shots) {
  const { size } = statSync(join(shotsDir, file));
  if (size > 262144) throw new Error(`screenshot too big: ${file} (${size} bytes, max 262144)`);
  if (!/\.(jpe?g|png)$/i.test(file)) throw new Error(`screenshot must be JPEG or PNG: ${file}`);
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`Leonida Legends handed in: ${outDir} (${shots.length} screenshots)`);
