#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sharedDir = resolve(root, "examples/shared");
const ejsonFile = "secrets.ejson";
const secretsModulePath = resolve(sharedDir, "secrets.ts");
const secretsModuleRelativePath = "examples/shared/secrets.ts";

try {
  const privateKey: string | undefined = process.env.EJSON_PRIVATE_KEY;
  const args: string[] = privateKey
    ? ["decrypt", "--key-from-stdin", ejsonFile]
    : ["decrypt", ejsonFile];

  const output: string = execFileSync("ejson", args, {
    cwd: sharedDir,
    encoding: "utf8",
    input: privateKey,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const secrets = JSON.parse(output) as Record<string, string>;
  writeFileSync(secretsModulePath, formatSecretsModule(secrets), { mode: 0o600 });
  chmodSync(secretsModulePath, 0o600);
  markSecretsModuleLocal();
  process.stderr.write(`Wrote ${secretsModulePath}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `Failed to decrypt examples/shared/${ejsonFile}: ${message}\n\n` +
      "Local development:\n" +
      "  Configure ejson's keydir, then run pnpm run examples:secrets:decrypt\n\n" +
      "CI environment:\n" +
      "  Set EJSON_PRIVATE_KEY, then run pnpm run examples:secrets:decrypt\n",
  );
  process.exit(1);
}

function markSecretsModuleLocal(): void {
  try {
    execFileSync("git", ["update-index", "--skip-worktree", secretsModuleRelativePath], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    process.stderr.write(`Marked ${secretsModuleRelativePath} as local-only in Git index\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Could not mark ${secretsModuleRelativePath} local-only: ${message}\n` +
        `Avoid staging decrypted changes to ${secretsModuleRelativePath}.\n`,
    );
  }
}

function formatSecretsModule(secrets: Record<string, string>): string {
  const entries = Object.entries(secrets)
    .map(([key, value]) => `  ${formatObjectKey(key)}: ${JSON.stringify(value)},`)
    .join("\n");

  return `const secrets = {\n${entries}\n} as const;\n\nexport default secrets;\n`;
}

function formatObjectKey(key: string): string {
  return /^[$A-Z_a-z][$\w]*$/.test(key) ? key : JSON.stringify(key);
}
