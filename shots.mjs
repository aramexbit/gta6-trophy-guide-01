// Screenshot script for the Leonida Legends guide: real renders of app/ in
// headless Chromium, driven over CDP with Node's built-in WebSocket — no
// extra packages. Run with the app served first (`node serve.ts`, port 8080),
// then `node shots.mjs`. Writes 4 JPEGs (1280x800, quality 80) to screenshots/.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const DEBUG_PORT = 9223;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDebug() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chromium devtools did not come up');
}

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

try {
  await waitForDebug();
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 1;
  const pending = new Map();
  const loaders = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === 'Page.loadEventFired') {
      for (const r of loaders.splice(0)) r();
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const waitLoad = () => new Promise((r) => loaders.push(r));

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  async function shot(file, url, scrollTo) {
    const loaded = waitLoad();
    await call('Page.navigate', { url });
    await loaded;
    await sleep(900); // let fetch('data/trophies.json') render the cards
    if (scrollTo) {
      await call('Runtime.evaluate', {
        expression: `document.getElementById('${scrollTo}')?.scrollIntoView({block:'start'}); window.scrollBy(0,-8); 'ok'`,
      });
      await sleep(350);
    }
    const { data } = await call('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    const bytes = Buffer.from(data, 'base64');
    writeFileSync(join('screenshots', file), bytes);
    console.log('wrote', file, `${bytes.length} bytes`);
  }

  // 1 — cover: hero, progress ring, missable alert, roadmap, filters, checklist.
  await shot('1-checklist.jpg', 'http://localhost:8080/?demo=1');
  // 2 — the missable trophy (Positive Mental Attitude) with its guide and sources.
  await shot('2-detail.jpg', 'http://localhost:8080/?demo=1', 'trophy-28');
  // 3 — roadmap to the Platinum with per-stage progress.
  await shot('3-roadmap.jpg', 'http://localhost:8080/?demo=1', 'roadmapSection');
  // 4 — spoiler-free mode on: unearned story trophies locked.
  await shot('4-spoiler.jpg', 'http://localhost:8080/?demo=1&spoiler=1', 'trophy-5');

  ws.close();
  console.log('done');
} finally {
  chrome.kill('SIGKILL');
}
