#!/usr/bin/env node
// Orchestrates each examples/* dev server on a freshly-allocated port,
// serves a hub UI with status, iframes, and live log streams, and opens
// it in the default browser. Hub stays the source of truth for ports.

import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import type { Server as HttpServer, ServerResponse } from "node:http";
import { createServer as createHttpServer } from "node:http";
import type { Server as NetServer, Socket } from "node:net";
import { createServer as createNetServer, connect as netConnect } from "node:net";
import { platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXAMPLES_DIR = resolve(ROOT, "examples");
const SHARED_SECRETS_MODULE_PATH = resolve(EXAMPLES_DIR, "shared/secrets.ts");
const LOG_BUFFER = 500;
const PROBE_INTERVAL_MS = 800;
const PROBE_TIMEOUT_MS = 400;

type Example = {
  name: string;
  pkgName: string;
};

type ExampleStatus = "pending" | "booting" | "running" | "exited";
type LogStream = "stdout" | "stderr" | "system";

type LogEntry = {
  stream: LogStream;
  line: string;
  t: number;
};

type ExampleState = {
  name: string;
  port: number | null;
  status: ExampleStatus;
  logs: LogEntry[];
};

type StatePatch = Partial<Pick<ExampleState, "port" | "status">>;
type SharedSecrets = Record<string, string>;

// Each example must accept `--port <n>` via its `dev` script. base/scripts/dev.js
// wraps `serve` to match the framework dev commands.
async function discoverExamples(): Promise<Example[]> {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const out: Example[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      const pkg = JSON.parse(
        await readFile(resolve(EXAMPLES_DIR, e.name, "package.json"), "utf8"),
      ) as {
        name?: string;
        scripts?: Record<string, string>;
      };
      if (pkg.name && pkg.scripts?.dev) {
        out.push({ name: e.name, pkgName: pkg.name });
      }
    } catch {}
  }
  out.sort((a, b) => {
    if (a.name === "base") return -1;
    if (b.name === "base") return 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

const state = new Map<string, ExampleState>();

const sseClients = new Set<ServerResponse>();
const children: ChildProcess[] = [];
let sharedSecrets: SharedSecrets = {};

function broadcast(event: string, data: unknown): void {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) {
    try {
      c.write(msg);
    } catch {}
  }
}

function setStatus(name: string, patch: StatePatch): void {
  const s = state.get(name);
  if (!s) return;
  Object.assign(s, patch);
  broadcast("state", { name, port: s.port, status: s.status });
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

function addLog(name: string, stream: LogStream, line: string): void {
  const clean = line.replace(ANSI_RE, "");
  if (!clean) return;
  const s = state.get(name);
  if (!s) return;
  const entry = { stream, line: clean, t: Date.now() };
  s.logs.push(entry);
  if (s.logs.length > LOG_BUFFER) s.logs.shift();
  broadcast("log", { name, ...entry });
}

function getFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s: NetServer = createNetServer();
    s.unref();
    s.listen(0, "127.0.0.1", () => {
      const address = s.address();
      if (address === null || typeof address === "string") {
        rej(new Error("Unable to allocate an example port"));
        return;
      }
      const port = address.port;
      s.close(() => res(port));
    });
    s.on("error", rej);
  });
}

function tryConnectHost(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const s: Socket = netConnect({ port, host });
    const t = setTimeout(() => {
      s.destroy();
      resolve(false);
    }, PROBE_TIMEOUT_MS);
    s.once("connect", () => {
      clearTimeout(t);
      s.destroy();
      resolve(true);
    });
    s.once("error", () => {
      clearTimeout(t);
      resolve(false);
    });
  });
}

// Vite-based dev servers (astro, sveltekit, react-router, vinxi) bind to
// IPv6 [::1] only by default; `serve` and Next bind to all interfaces. Probe
// both so we don't false-negative on the IPv6-only ones.
async function tryConnect(port: number): Promise<boolean> {
  const [v4, v6] = await Promise.all([
    tryConnectHost(port, "127.0.0.1"),
    tryConnectHost(port, "::1"),
  ]);
  return v4 || v6;
}

function openBrowser(url: string): void {
  const p = platform();
  const cmd = p === "darwin" ? "open" : p === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  } catch {}
}

function spawnExample(ex: Example, port: number): void {
  const child = spawn("pnpm", ["--filter", ex.pkgName, "dev", "--port", String(port)], {
    cwd: ROOT,
    env: { ...process.env, ...sharedSecrets, FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  const pipeLines = (stream: NodeJS.ReadableStream, label: LogStream): void => {
    let buf = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, "");
        buf = buf.slice(i + 1);
        if (line.length) addLog(ex.name, label, line);
      }
    });
  };
  pipeLines(child.stdout, "stdout");
  pipeLines(child.stderr, "stderr");

  child.on("exit", (code, signal) => {
    addLog(ex.name, "system", `process exited (code=${code} signal=${signal})`);
    setStatus(ex.name, { status: "exited" });
  });
  child.on("error", (err) => {
    addLog(ex.name, "system", `spawn error: ${err.message}`);
    setStatus(ex.name, { status: "exited" });
  });

  (async () => {
    while (state.get(ex.name)?.status !== "exited") {
      const ok = await tryConnect(port);
      const cur = state.get(ex.name)?.status;
      if (ok && cur !== "running") setStatus(ex.name, { status: "running" });
      else if (!ok && cur === "running") setStatus(ex.name, { status: "booting" });
      await new Promise((r) => setTimeout(r, PROBE_INTERVAL_MS));
    }
  })();
}

function snapshot(): ExampleState[] {
  return Array.from(state.values()).map((s) => ({
    name: s.name,
    port: s.port,
    status: s.status,
    logs: s.logs.slice(-100),
  }));
}

function startHub(hubPort: number): Promise<HttpServer> {
  const server = createHttpServer((req, res) => {
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(HTML);
      return;
    }
    if (req.url === "/api/state") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(snapshot()));
      return;
    }
    if (req.url === "/api/stream") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write("retry: 2000\n\n");
      res.write(`event: init\ndata: ${JSON.stringify(snapshot())}\n\n`);
      sseClients.add(res);
      const ka = setInterval(() => {
        try {
          res.write(":ka\n\n");
        } catch {}
      }, 15000);
      req.on("close", () => {
        clearInterval(ka);
        sseClients.delete(res);
      });
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve, reject) => {
    server.listen(hubPort, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stderr.write("\nshutting down...\n");
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {}
  }
  setTimeout(() => {
    for (const c of children) {
      if (c.exitCode === null && c.signalCode === null) {
        try {
          c.kill("SIGKILL");
        } catch {}
      }
    }
    process.exit(0);
  }, 2500);
}

async function main(): Promise<void> {
  process.stderr.write("hydrogen examples — allocating ports\n");
  sharedSecrets = await loadSharedSecrets();
  const examples = await discoverExamples();
  if (!examples.length) {
    process.stderr.write("no examples found under examples/\n");
    process.exit(1);
  }
  for (const ex of examples) {
    state.set(ex.name, { name: ex.name, port: null, status: "pending", logs: [] });
  }

  const hubPort = await getFreePort();
  for (const ex of examples) {
    const p = await getFreePort();
    const s = state.get(ex.name);
    if (s) s.port = p;
  }

  await startHub(hubPort);
  const hubUrl = `http://localhost:${hubPort}/`;

  process.stderr.write(`\nhub: ${hubUrl}\n`);
  for (const ex of examples) {
    const s = state.get(ex.name);
    if (!s) continue;
    process.stderr.write(`  ${ex.name.padEnd(15)} :${s.port}\n`);
  }
  process.stderr.write("\n");

  for (const ex of examples) {
    const s = state.get(ex.name);
    if (s?.port === null || s?.port === undefined) continue;
    setStatus(ex.name, { status: "booting", port: s.port });
    spawnExample(ex, s.port);
  }

  openBrowser(hubUrl);

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function loadSharedSecrets(): Promise<SharedSecrets> {
  if (!existsSync(SHARED_SECRETS_MODULE_PATH)) return {};

  const { default: raw } = (await import(SHARED_SECRETS_MODULE_PATH)) as {
    default: Record<string, unknown>;
  };
  const secrets: SharedSecrets = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key !== "_public_key" && typeof value === "string" && value) {
      secrets[key] = value;
    }
  }
  return secrets;
}

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>hydrogen · examples</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #0a0a0b;
    color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 14px;
    padding: 16px;
  }
  header {
    display: flex; align-items: baseline; gap: 12px;
    padding: 4px 4px 16px;
  }
  header h1 { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
  header .count { color: #8b8b94; font-size: 12px; font-variant-numeric: tabular-nums; }
  header .hint { margin-left: auto; color: #6b6b74; font-size: 11px; }
  .grid {
    display: grid; gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  }
  .card {
    background: #131316;
    border: 1px solid #26262c;
    border-radius: 8px;
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  .card-head {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px;
    border-bottom: 1px solid #26262c;
    background: #16161a;
  }
  .dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: #6b6b74; flex-shrink: 0;
    transition: background .15s, box-shadow .15s;
  }
  .dot.running { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.6); }
  .dot.booting { background: #f59e0b; }
  .dot.exited  { background: #ef4444; }
  .name { font-weight: 600; font-size: 13px; }
  .port {
    color: #8b8b94;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }
  .open {
    margin-left: auto;
    color: #60a5fa; text-decoration: none;
    font-size: 12px; padding: 4px 8px;
    border-radius: 4px;
  }
  .open:hover { background: #1f1f25; text-decoration: underline; }
  .frame-wrap {
    aspect-ratio: 16 / 11;
    background: #fff;
    position: relative;
    overflow: hidden;
  }
  /* Render the iframe at 2.5× the wrapper size and scale it down to 0.4×.
     Net effect: a non-interactive thumbnail that shows ~desktop layout. */
  iframe.preview {
    position: absolute;
    top: 0; left: 0;
    width: 250%; height: 250%;
    border: 0; display: block; background: #fff;
    transform: scale(0.4);
    transform-origin: 0 0;
    pointer-events: none;
  }
  /* Transparent overlay captures clicks and scroll wheel so the iframe
     can't be interacted with; click opens the example in a new tab. */
  a.frame-link {
    position: absolute; inset: 0;
    z-index: 2;
    cursor: pointer;
    display: block;
    transition: background .12s;
  }
  a.frame-link:hover {
    background: linear-gradient(to bottom, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55));
  }
  a.frame-link::after {
    content: "open in new tab ↗";
    position: absolute;
    bottom: 10px; right: 12px;
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 2px rgba(0,0,0,.8);
    opacity: 0;
    transition: opacity .12s;
  }
  a.frame-link:hover::after { opacity: 1; }
  .placeholder {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: #6b6b74; font-size: 12px;
    background: repeating-linear-gradient(45deg, #0a0a0b 0 12px, #101013 12px 24px);
  }
  details.logs {
    border-top: 1px solid #26262c;
    background: #0c0c0e;
  }
  details.logs summary {
    padding: 7px 12px;
    cursor: pointer;
    font-size: 12px;
    color: #8b8b94;
    user-select: none;
    list-style: none;
  }
  details.logs summary::-webkit-details-marker { display: none; }
  details.logs summary::before {
    content: "▸ ";
    display: inline-block;
    width: 1em;
    color: #6b6b74;
    transition: transform .1s;
  }
  details.logs[open] summary::before { content: "▾ "; }
  details.logs summary:hover { color: #e5e7eb; }
  pre.log {
    margin: 0; padding: 8px 12px;
    max-height: 260px; overflow: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px; line-height: 1.55;
    background: #08080a; color: #c9c9d3;
    white-space: pre-wrap; word-break: break-word;
  }
  pre.log .stderr { color: #fca5a5; }
  pre.log .system { color: #fbbf24; font-style: italic; }
  pre.log:empty::before { content: "no output yet…"; color: #4a4a52; }
</style>
</head>
<body>
<header>
  <h1>hydrogen · examples</h1>
  <span class="count" id="count">…</span>
  <span class="hint">click iframe to interact · use ↗ to pop out</span>
</header>
<div class="grid" id="grid"></div>
<script>
  const grid = document.getElementById("grid");
  const countEl = document.getElementById("count");
  const cards = new Map();

  function buildCard(name) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML =
      '<div class="card-head">' +
        '<span class="dot"></span>' +
        '<span class="name"></span>' +
        '<span class="port"></span>' +
        '<a class="open" target="_blank" rel="noopener">open ↗</a>' +
      '</div>' +
      '<div class="frame-wrap"><div class="placeholder">waiting…</div></div>' +
      '<details class="logs"><summary>logs</summary><pre class="log"></pre></details>';
    grid.appendChild(el);
    return {
      el,
      dot: el.querySelector(".dot"),
      name: el.querySelector(".name"),
      port: el.querySelector(".port"),
      open: el.querySelector(".open"),
      frame: el.querySelector(".frame-wrap"),
      log: el.querySelector("pre.log"),
      details: el.querySelector("details.logs"),
      currentSrc: null,
    };
  }

  function getCard(name) {
    let c = cards.get(name);
    if (!c) {
      c = buildCard(name);
      cards.set(name, c);
    }
    return c;
  }

  function render(s) {
    const c = getCard(s.name);
    c.name.textContent = s.name;
    c.port.textContent = s.port ? ":" + s.port : "";
    c.dot.className = "dot " + (s.status || "");
    const url = s.port ? "http://localhost:" + s.port + "/" : "#";
    c.open.href = url;
    if (s.status === "running") {
      if (c.currentSrc !== url) {
        c.frame.innerHTML =
          '<iframe class="preview" loading="lazy" tabindex="-1" scrolling="no" aria-hidden="true"></iframe>' +
          '<a class="frame-link" target="_blank" rel="noopener" aria-label="open ' + s.name + ' in new tab"></a>';
        c.frame.querySelector("iframe").src = url;
        c.frame.querySelector("a.frame-link").href = url;
        c.currentSrc = url;
      } else {
        // status flipped to running again with same url — nothing to rebuild
      }
    } else {
      const label = s.status === "exited" ? "exited" : s.status === "booting" ? "booting…" : "pending";
      c.frame.innerHTML = '<div class="placeholder">' + label + "</div>";
      c.currentSrc = null;
    }
    updateCount();
  }

  function appendLogLine(c, stream, line) {
    const span = document.createElement("span");
    if (stream === "stderr") span.className = "stderr";
    else if (stream === "system") span.className = "system";
    span.textContent = line + "\\n";
    c.log.appendChild(span);
    while (c.log.childNodes.length > 800) c.log.removeChild(c.log.firstChild);
    if (c.details.open) c.log.scrollTop = c.log.scrollHeight;
  }

  function updateCount() {
    let r = 0;
    for (const c of cards.values()) {
      if (c.dot.classList.contains("running")) r++;
    }
    countEl.textContent = r + "/" + cards.size + " running";
  }

  function connect() {
    const es = new EventSource("/api/stream");
    es.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      // re-render fresh on (re)connect
      for (const s of data) {
        render(s);
        const c = getCard(s.name);
        c.log.innerHTML = "";
        for (const entry of s.logs || []) appendLogLine(c, entry.stream, entry.line);
      }
    });
    es.addEventListener("state", (e) => {
      render(JSON.parse(e.data));
    });
    es.addEventListener("log", (e) => {
      const { name, stream, line } = JSON.parse(e.data);
      appendLogLine(getCard(name), stream, line);
    });
    es.onerror = () => {
      // EventSource will retry automatically per "retry:" hint.
    };
  }
  connect();
</script>
</body>
</html>`;

main().catch((err) => {
  process.stderr.write(`fatal: ${err?.stack || err}\n`);
  process.exit(1);
});
