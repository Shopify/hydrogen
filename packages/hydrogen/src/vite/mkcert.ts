import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { consoleLogger, getLogger } from "../core/logging";

const log = getLogger("local-https");

// Step confirmations print unprefixed on purpose: they are terminal output for
// an interactive provisioning flow, not subsystem log entries.
function confirm(message: string) {
  consoleLogger.info(`☑️ ${message}`);
}

// mkcert is pinned to an exact release and verified against SHA-256 checksums
// so that a compromised or replaced "latest" release can never execute.
// Checksums are sourced from the Hermit (cashapp/hermit-packages, mkcert.hcl)
// and Scoop (ScoopInstaller/Extras, bucket/mkcert.json) package registries.
const MKCERT_VERSION = "v1.4.4";
const MKCERT_RELEASE_BASE_URL = `https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}`;
const EXECUTABLE_MODE = 0o755;
const SUCCESS_EXIT_CODE = 0;
const DOWNLOAD_TIMEOUT_MS = 60_000;

const MKCERT_BINARIES: Record<string, { assetName: string; sha256: string }> = {
  "darwin-arm64": {
    assetName: `mkcert-${MKCERT_VERSION}-darwin-arm64`,
    sha256: "c8af0df44bce04359794dad8ea28d750437411d632748049d08644ffb66a60c6",
  },
  "darwin-x64": {
    assetName: `mkcert-${MKCERT_VERSION}-darwin-amd64`,
    sha256: "a32dfab51f1845d51e810db8e47dcf0e6b51ae3422426514bf5a2b8302e97d4e",
  },
  "linux-arm64": {
    assetName: `mkcert-${MKCERT_VERSION}-linux-arm64`,
    sha256: "b98f2cc69fd9147fe4d405d859c57504571adec0d3611c3eefd04107c7ac00d0",
  },
  "linux-x64": {
    assetName: `mkcert-${MKCERT_VERSION}-linux-amd64`,
    sha256: "6d31c65b03972c6dc4a14ab429f2928300518b26503f58723e532d1b0a3bbb52",
  },
  "win32-arm64": {
    assetName: `mkcert-${MKCERT_VERSION}-windows-arm64.exe`,
    sha256: "793747256c562622d40127c8080df26add2fb44c50906ce9db63b42a5280582e",
  },
  "win32-x64": {
    assetName: `mkcert-${MKCERT_VERSION}-windows-amd64.exe`,
    sha256: "d2660b50a9ed59eada480750561c96abc2ed4c9a38c6a24d93e30e0977631398",
  },
};

export type MkcertBinary = {
  assetName: string;
  sha256: string;
  url: string;
};

/** @internal Exported for tests. */
export function resolveMkcertBinary(platform: string, arch: string): MkcertBinary | undefined {
  const binary = MKCERT_BINARIES[`${platform}-${arch}`];
  if (!binary) return undefined;

  return { ...binary, url: `${MKCERT_RELEASE_BASE_URL}/${binary.assetName}` };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** @internal Exported for tests. */
export async function downloadVerified(options: {
  url: string;
  sha256: string;
  destination: string;
}): Promise<void> {
  let bytes: Uint8Array;
  try {
    const response = await fetch(options.url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`mkcert download failed with status ${response.status}: ${options.url}`);
    }

    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(
        `mkcert download timed out after ${DOWNLOAD_TIMEOUT_MS / 1_000}s: ${options.url}`,
        { cause: error },
      );
    }
    throw error;
  }
  const digest = sha256Hex(bytes);
  if (digest !== options.sha256) {
    throw new Error(
      `mkcert download did not match the pinned SHA-256 checksum; refusing to run it.\n` +
        `  URL:      ${options.url}\n` +
        `  Expected: ${options.sha256}\n` +
        `  Received: ${digest}`,
    );
  }

  await mkdir(dirname(options.destination), { recursive: true });

  // Write-then-rename keeps concurrent dev servers from ever spawning a
  // partially written binary: rename is atomic on the same filesystem.
  const temporaryPath = `${options.destination}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, bytes, { mode: EXECUTABLE_MODE });
    await chmod(temporaryPath, EXECUTABLE_MODE);
    await rename(temporaryPath, options.destination);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function ensureMkcertBinary(): Promise<string> {
  const binary = resolveMkcertBinary(process.platform, process.arch);
  if (!binary) {
    throw new Error(
      `Automatic mkcert download is not available for ${process.platform}-${process.arch}. ` +
        "Install mkcert manually and generate the certificate.",
    );
  }

  const binaryPath = join(homedir(), ".shopify", "hydrogen", "mkcert", binary.assetName);
  if (existsSync(binaryPath) && sha256Hex(await readFile(binaryPath)) === binary.sha256) {
    return binaryPath;
  }

  log.info(`downloading mkcert ${MKCERT_VERSION}…`);
  await downloadVerified({ url: binary.url, sha256: binary.sha256, destination: binaryPath });
  confirm(`mkcert ${MKCERT_VERSION} downloaded`);

  return binaryPath;
}

function runMkcert(binaryPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // stdin stays inherited so sudo can prompt on the terminal (sudo talks to
    // the tty directly, not to the piped streams). mkcert's verbose output is
    // captured instead of shown, and surfaced only when the command fails.
    const child = spawn(binaryPath, args, { stdio: ["inherit", "pipe", "pipe"] });

    let output = "";
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === SUCCESS_EXIT_CODE) {
        resolve(output);
        return;
      }

      const reason = signal ? `mkcert was killed by ${signal}` : `mkcert exited with code ${code}`;
      reject(new Error(output.trim() === "" ? reason : `${reason}\n${output.trim()}`));
    });
  });
}

export type ProvisionSettings = {
  host: string;
  certPath: string;
  keyPath: string;
};

export async function provisionCertificates(settings: ProvisionSettings): Promise<void> {
  const binaryPath = await ensureMkcertBinary();

  await mkdir(dirname(settings.certPath), { recursive: true });
  await mkdir(dirname(settings.keyPath), { recursive: true });

  log.info("generating a trusted local certificate; mkcert may prompt for your password.");
  const mkcertOutput = await runMkcert(binaryPath, [
    "-install",
    "-cert-file",
    settings.certPath,
    "-key-file",
    settings.keyPath,
    settings.host,
  ]);
  confirm(
    mkcertOutput.includes("The local CA is already installed")
      ? "The local CA is already installed in the system trust store"
      : "The local CA is now installed in the system trust store",
  );
  confirm(`Created a new certificate for "${settings.host}"`);

  log.info("verifying certificates…");
  const missingPaths = [settings.certPath, settings.keyPath].filter((path) => !existsSync(path));
  if (missingPaths.length > 0) {
    throw new Error(`mkcert did not create the expected files: ${missingPaths.join(", ")}`);
  }
  confirm("local https certificates ready");
}

export async function uninstallCertificateAuthority(): Promise<void> {
  const binaryPath = await ensureMkcertBinary();

  log.info("removing the local certificate authority; mkcert may prompt for your password.");
  await runMkcert(binaryPath, ["-uninstall"]);
  confirm("The local CA was removed from the system trust stores");
}
