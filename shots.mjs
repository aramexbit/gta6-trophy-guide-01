/* Leonida Legends — screenshot renderer.
   Serves app/ locally, drives the installed headless Chromium over the
   DevTools protocol, and captures four real renders of the running app
   at 1280x800 into screenshots/. No image is fabricated: every JPEG is
   a screenshot of the actual page. Run with: node shots.mjs */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const PORT = 8931;
const DEBUG_PORT = 9331;
const WIDTH = 1280;
const HEIGHT = 800;
const SHOTS_DIR = join(root, "screenshots");

const CHROME_CANDIDATES = [
  process.env.HOME + "/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome",
  process.env.HOME + "/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome",
  process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell",
  process.env.CHROME_PATH || "",
  "/opt/meta-chromium/chrome"
].filter(Boolean);

const SHOTS = [
  { file: "1-checklist.jpg", url: "http://127.0.0.1:" + PORT + "/", seed: [2, 3, 4, 8, 9, 16, 21, 46, 55, 18, 33, 35], note: "checklist" },
  { file: "2-detail.jpg", url: "http://127.0.0.1:" + PORT + "/#trophy-28", seed: [2, 3, 4, 8, 9, 16, 21, 46, 55, 18, 33, 35], note: "detail" },
  { file: "3-roadmap.jpg", url: "http://127.0.0.1:" + PORT + "/#roadmap", seed: [2, 3, 4, 8, 9, 16, 21, 46, 55, 18, 33, 35], note: "roadmap" },
  { file: "4-spoiler.jpg", url: "http://127.0.0.1:" + PORT + "/#spoiler", seed: [2, 3, 4, 8, 9, 16, 21, 46, 55, 18, 33, 35], note: "spoiler" }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch { /* keep waiting */ }
    await sleep(200);
  }
  throw new Error("timed out waiting for " + label);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error("CDP " + msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  ready() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error("CDP websocket failed"));
    });
  }
  send(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error("page eval failed: " + JSON.stringify(res.exceptionDetails).slice(0, 300));
    }
    return res.result ? res.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (p && existsSync(p)) return p;
  }
  throw new Error("no headless Chromium found; tried " + CHROME_CANDIDATES.join(", "));
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });

  const server = spawn(process.execPath, [join(root, "serve.ts"), "--port", String(PORT)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});
  const stopServer = () => { try { server.kill("SIGTERM"); } catch { /* ignore */ } };

  try {
    await waitFor(async () => {
      const res = await fetch("http://127.0.0.1:" + PORT + "/index.html");
      return res.ok;
    }, 15000, "local server");

    const chrome = findChrome();
    const browser = spawn(chrome, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--remote-debugging-port=" + DEBUG_PORT,
      "--user-data-dir=" + join(root, ".chrome-shots-profile"),
      "about:blank"
    ], { stdio: ["ignore", "pipe", "pipe"] });
    const stopBrowser = () => { try { browser.kill("SIGTERM"); } catch { /* ignore */ } };

    try {
      const targets = await waitFor(async () => {
        const res = await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/version");
        if (!res.ok) return null;
        return res.json();
      }, 20000, "Chromium DevTools");
      const wsUrl = targets.webSocketDebuggerUrl;

      const cdp = new Cdp(wsUrl);
      await cdp.ready();
      const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
      const pageList = await (await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/list")).json();
      const page = pageList.find((t) => t.id === targetId) || pageList.find((t) => t.type === "page");
      const pageCdp = new Cdp(page.webSocketDebuggerUrl);
      await pageCdp.ready();
      await pageCdp.send("Page.enable");
      await pageCdp.send("Runtime.enable");
      await pageCdp.send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false
      });

      for (const shot of SHOTS) {
        const seedJson = JSON.stringify(shot.seed);
        // First load so localStorage has a real origin, then seed the
        // checklist state, reload, and screenshot the real render.
        await pageCdp.send("Page.navigate", { url: shot.url });
        await waitFor(async () => {
          const n = await pageCdp.evaluate("document.querySelectorAll('.trophy-card').length");
          return n === 55;
        }, 20000, "55 trophy cards for " + shot.file);
        await pageCdp.evaluate(
          "localStorage.setItem('leonida-legends-earned-v1', JSON.stringify(" + seedJson + ".reduce((o,id)=>{o[id]=true;return o;},{})));" +
          "localStorage.setItem('leonida-legends-spoiler-v1', '0');"
        );
        await pageCdp.send("Page.reload", { ignoreCache: true });
        await waitFor(async () => {
          const n = await pageCdp.evaluate("document.querySelectorAll('.trophy-card').length");
          return n === 55;
        }, 20000, "55 trophy cards after reload for " + shot.file);
        // Same-tab hash navigations preserve scroll, so place the
        // viewport deliberately for each scene.
        if (shot.note === "roadmap") {
          await pageCdp.evaluate("document.getElementById('roadmap').scrollIntoView();");
        } else if (shot.note === "spoiler") {
          // Show the first trophy cards, where the blurred guides are visible.
          await pageCdp.evaluate("window.scrollTo(0, document.querySelector('.trophy-grid').getBoundingClientRect().top + window.scrollY - 120);");
        } else {
          await pageCdp.evaluate("window.scrollTo(0, 0);");
        }
        await sleep(900);
        const { data } = await pageCdp.send("Page.captureScreenshot", {
          format: "jpeg", quality: 85
        });
        writeFileSync(join(SHOTS_DIR, shot.file), Buffer.from(data, "base64"));
        console.log("wrote screenshots/" + shot.file);
      }

      pageCdp.close();
      cdp.close();
    } finally {
      stopBrowser();
    }
  } finally {
    stopServer();
  }
  console.log("done: 4 screenshots in screenshots/");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
