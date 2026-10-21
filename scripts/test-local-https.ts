import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { access } from "node:fs/promises";
import { connect } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const HOST = "local.tryhydrogen.dev";
const PORT = 5_173;
const REQUEST_TIMEOUT_MS = 5_000;
const READINESS_TIMEOUT_MS = 60_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const SERVER_URL = `https://${HOST}:${PORT}/favicon.svg`;

const packageManagerCli = process.env.npm_execpath;
if (!packageManagerCli) {
  throw new Error("npm_execpath is missing. Run this test through the package manager script.");
}

const certificateDirectory = join(homedir(), ".shopify", "hydrogen", "certs");
await Promise.all([
  access(join(certificateDirectory, `${HOST}.pem`)),
  access(join(certificateDirectory, `${HOST}-key.pem`)),
]);
await assertPortAvailable();

const server = spawn(
  process.execPath,
  [packageManagerCli, "--filter", "@shopify/hydrogen-template-react-router", "dev:https"],
  {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env: { ...process.env, CI: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let stopping = false;
let serverClosed = false;
const serverClose = new Promise<void>((resolve) => {
  server.once("close", () => {
    serverClosed = true;
    resolve();
  });
});

server.stdout?.on("data", (chunk: Buffer) => {
  if (!stopping) process.stdout.write(chunk);
});
server.stderr?.on("data", (chunk: Buffer) => {
  if (!stopping) process.stderr.write(chunk);
});

try {
  await Promise.race([waitForTrustedHttps(), rejectIfServerStops(server)]);
  console.log(`Trusted local HTTPS verified at ${SERVER_URL}`);
} finally {
  stopping = true;
  await stopProcessTree(server, serverClose, () => serverClosed);
}

async function waitForTrustedHttps() {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(SERVER_URL, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`Received HTTP ${response.status}`);
      await response.body?.cancel();

      return;
    } catch (error) {
      lastError = error;
      await delay(500);
    }
  }

  throw new Error(`Trusted HTTPS server was not ready after ${READINESS_TIMEOUT_MS}ms`, {
    cause: lastError,
  });
}

async function assertPortAvailable() {
  const portInUse = await new Promise<boolean>((resolve) => {
    const socket = connect({ host: HOST, port: PORT });
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(REQUEST_TIMEOUT_MS, () => finish(false));
  });

  if (portInUse) throw new Error(`${HOST}:${PORT} is already in use`);
}

function rejectIfServerStops(child: ChildProcess) {
  return new Promise<never>((_resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          signal
            ? `Local HTTPS server was killed by ${signal}`
            : `Local HTTPS server exited with code ${code}`,
        ),
      );
    });
  });
}

async function stopProcessTree(
  child: ChildProcess,
  closePromise: Promise<void>,
  isServerClosed: () => boolean,
) {
  if (!child.pid || isServerClosed()) return;

  if (process.platform === "win32") {
    if (child.exitCode !== null || child.signalCode !== null) {
      await requireServerClose(closePromise, isServerClosed);
      return;
    }

    const result = spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    if (result.error) throw result.error;
    if (result.status !== 0 && !isServerClosed()) {
      throw new Error(`taskkill failed with exit code ${result.status}`);
    }
    await requireServerClose(closePromise, isServerClosed);
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    await requireServerClose(closePromise, isServerClosed);
    return;
  }

  await Promise.race([closePromise, delay(SHUTDOWN_TIMEOUT_MS)]);

  try {
    process.kill(-child.pid, 0);
    process.kill(-child.pid, "SIGKILL");
  } catch {
    // The process group exited during the graceful shutdown period.
  }

  await requireServerClose(closePromise, isServerClosed);
}

async function requireServerClose(closePromise: Promise<void>, isServerClosed: () => boolean) {
  await Promise.race([closePromise, delay(SHUTDOWN_TIMEOUT_MS)]);
  if (!isServerClosed()) throw new Error("Local HTTPS server did not close after termination");
}
