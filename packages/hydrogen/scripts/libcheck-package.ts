import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEMP_DIR_PREFIX = "hydrogen-libcheck-";
const PACKAGE_TARBALL_EXTENSION = ".tgz";
const ATTW_ARGS = ["--profile", "esm-only", "--no-emoji"] as const;
const PACK_TIMEOUT_MS = 60_000;
const ATTW_TIMEOUT_MS = 120_000;
const FAILURE_EXIT_CODE = 1;

const tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));

function reportSpawnError(command: string, error: Error | undefined) {
  if (!error) return;

  process.stderr.write(`${command} failed: ${error.message}\n`);
}

function runLibcheck() {
  const packResult = spawnSync("pnpm", ["pack", "--pack-destination", tempDir], {
    encoding: "utf8",
    timeout: PACK_TIMEOUT_MS,
  });

  reportSpawnError("pnpm pack", packResult.error);

  if (packResult.status !== 0) {
    process.stdout.write(packResult.stdout);
    process.stderr.write(packResult.stderr);
    return packResult.status ?? FAILURE_EXIT_CODE;
  }

  const tarballPath = packResult.stdout
    .trim()
    .split("\n")
    .findLast((line) => line.endsWith(PACKAGE_TARBALL_EXTENSION));

  if (!tarballPath) {
    process.stderr.write("Could not find packed tarball path in pnpm pack output.\n");
    return FAILURE_EXIT_CODE;
  }

  const attwResult = spawnSync("attw", [tarballPath, ...ATTW_ARGS], {
    stdio: "inherit",
    timeout: ATTW_TIMEOUT_MS,
  });
  reportSpawnError("attw", attwResult.error);

  return attwResult.status ?? FAILURE_EXIT_CODE;
}

try {
  process.exitCode = runLibcheck();
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
