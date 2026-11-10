#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const secretsPath = resolve(root, "examples/shared/secrets.ejson");
const keyDir = process.env.EJSON_KEYDIR || "/opt/ejson/keys";

try {
  const publicKey = getPublicKey();
  const privateKey = getPrivateKey();
  const keyPath = resolve(keyDir, publicKey);

  mkdirSync(keyDir, { recursive: true });
  writeFileSync(keyPath, `${privateKey}\n`, { mode: 0o600 });
  chmodSync(keyPath, 0o600);

  execFileSync("ejson", ["decrypt", secretsPath], {
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
  });

  process.stderr.write(`Saved EJSON private key for ${publicKey} at ${keyPath}\n`);
  process.stderr.write("Verified examples/shared/secrets.ejson can decrypt.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to configure example secrets key: ${message}\n\n`);
  process.stderr.write(
    "Copy the EJSON private key to your clipboard, then run:\n" +
      "  pnpm run examples:secrets:setup\n\n" +
      "If /opt/ejson/keys is not writable, either create it first or set EJSON_KEYDIR.\n",
  );
  process.exit(1);
}

function getPublicKey(): string {
  const secrets = JSON.parse(readFileSync(secretsPath, "utf8")) as {
    _public_key?: unknown;
  };
  if (typeof secrets._public_key === "string" && /^[a-f0-9]{64}$/i.test(secrets._public_key)) {
    return secrets._public_key;
  }

  throw new Error(`Could not read a valid _public_key from ${secretsPath}`);
}

function getPrivateKey(): string {
  const privateKey = process.env.EJSON_PRIVATE_KEY?.trim() || readClipboard().trim();
  if (/^[a-f0-9]{64}$/i.test(privateKey)) return privateKey;

  throw new Error("Clipboard or EJSON_PRIVATE_KEY does not contain a valid EJSON private key");
}

function readClipboard(): string {
  return execFileSync("pbpaste", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
