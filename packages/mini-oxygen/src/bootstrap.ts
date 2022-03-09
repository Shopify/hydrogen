#!/usr/bin/env node
// Copied from miniflare https://github.com/cloudflare/miniflare/blob/870b401ef520c1826339ff060fd8a0a576392a91/packages/miniflare/bootstrap.js
// Used to enable modules support in node with cross platform compatability (Windows, Linux, Mac)

import childProcess from 'child_process';
import path from 'path';
import semiver from "semiver";

const MIN_NODE_VERSION = "16.7.0";

async function main() {
  if (semiver(process.versions.node, MIN_NODE_VERSION) < 0) {
    // Note Volta and nvm are also recommended in the official docs:
    // https://developers.cloudflare.com/workers/get-started/guide#2-install-the-workers-cli
    console.log(
        `MiniOxygen requires at least Node.js ${MIN_NODE_VERSION}. 
You should use the latest Node.js version if possible, as Oxygen Workers use a very up-to-date version of V8.
Consider using a Node.js version manager such as https://volta.sh/ or https://github.com/nvm-sh/nvm.`
    );
    process.exitCode = 1;
    return;
  }

  childProcess
    .spawn(
      process.execPath,
      [
        "--experimental-vm-modules",
        ...process.execArgv,
        path.join(__dirname, "run.js"),
        ...process.argv.slice(2),
      ],
      { stdio: "inherit" }
    )
    .on("exit", (code) => process.exit(code === null ? 1 : code));
}

void main();