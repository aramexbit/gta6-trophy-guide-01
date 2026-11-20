// Leonida Legends v5 — screenshot runner. Reads shots.json, serves app/ on a
// scratch port, renders each view in headless Chrome (the stock Google Chrome
// for Testing build), converts the PNG capture to a JPEG under the 256 KiB cap
// and writes it to screenshots/. Usage:
//   node shots.mjs
// The views are deep links the app itself understands (?view=detail, roadmap,
// spoiler, demo=1), so every shot is a real render of the app's own code.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const CHROME = join(process.env.HOME, '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const PORT = 8091;
const QUALITY = 82;
const MAX_BYTES = 262144;

const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf-8'));

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`server did not come up at ${url}`);
}

function toJpeg(pngPath, jpgPath, quality) {
  const script = [
    'from PIL import Image',
    `im = Image.open(${JSON.stringify(pngPath)}).convert("RGB")`,
    `im.save(${JSON.stringify(jpgPath)}, "JPEG", quality=${quality}, optimize=True)`,
  ].join('\n');
  execFileSync('python3', ['-c', script], { stdio: 'inherit' });
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'inherit' });
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  mkdirSync(join(here, 'screenshots'), { recursive: true });
  for (const shot of shots) {
    const { width, height } = shot.viewport;
    const png = join(tmpdir(), `leonida-v5-${shot.file}.png`);
    const jpg = join(here, 'screenshots', shot.file);
    execFileSync(CHROME, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      `--user-data-dir=${join(tmpdir(), 'leonida-v5-chrome-profile')}`,
      '--virtual-time-budget=8000',
      `--screenshot=${png}`,
      `http://127.0.0.1:${PORT}${shot.path}`,
    ], { stdio: 'inherit' });
    toJpeg(png, jpg, QUALITY);
    const size = statSync(jpg).size;
    if (size > MAX_BYTES) throw new Error(`${shot.file} is ${size} bytes, over the 256 KiB cap`);
    console.log(`${shot.file}: ${size} bytes`);
  }
  // Refresh the manifest with the measured sizes.
  const manifest = shots.map((s) => ({
    ...s,
    bytes: statSync(join(here, 'screenshots', s.file)).size,
  }));
  writeFileSync(join(here, 'shots.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('all shots rendered');
} finally {
  server.kill('SIGTERM');
}
