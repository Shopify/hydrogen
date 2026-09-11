#!/usr/bin/env node
// Wrapper so `pnpm dev --port <n>` honors --port like the framework examples.
const { spawn } = require("node:child_process");

const i = process.argv.indexOf("--port");
const port = i >= 0 ? process.argv[i + 1] : "5173";

const child = spawn("serve", ["--listen", port, "--no-clipboard", "."], {
  stdio: "inherit",
});

const forward = (sig) => () => {
  try {
    child.kill(sig);
  } catch {}
};
process.on("SIGINT", forward("SIGINT"));
process.on("SIGTERM", forward("SIGTERM"));
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
