// Screenshot script for the GTA VI trophy guide: real renders of app/ in Chromium.
// Run with the app served first: `node serve.ts` (port 8080), then `node shots.mjs`.
// Writes 4 JPEGs (1280x800, quality 80) into screenshots/.
import { createRequire } from 'node:module';
const require = createRequire('/tmp/shots-tool/package.json');
const { chromium } = require('playwright-core');

const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function shot(file, url, act) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  if (act) await act();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshots/${file}`, type: 'jpeg', quality: 80 });
  console.log('wrote', file);
}

// 1 — cover: dense checklist with progress, filters and roadmap strip at the top.
await shot('1-checklist.jpg', 'http://localhost:8080/?demo=1');
// 2 — a trophy guide open with its sources: the missable one, at the top of the frame.
await shot('2-detail.jpg', 'http://localhost:8080/?demo=1', async () => {
  await page.evaluate(() => document.getElementById('trophy-28').scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -12));
});
// 3 — roadmap to the Platinum plus the missable banner.
await shot('3-roadmap.jpg', 'http://localhost:8080/?demo=1', async () => {
  await page.evaluate(() => document.getElementById('roadmapSection').scrollIntoView({ block: 'start' }));
});
// 4 — spoiler-free mode on: story trophies locked until earned, shown in the grid.
await shot('4-spoiler.jpg', 'http://localhost:8080/?demo=1&spoiler=1', async () => {
  await page.evaluate(() => document.getElementById('trophy-5').scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -12));
});

await browser.close();
console.log('done');
