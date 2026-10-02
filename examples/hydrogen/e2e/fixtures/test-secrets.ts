/**
 * Test secrets loading module.
 *
 * Retrieves E2E test secrets from a generated CI file or local EJSON decryption:
 *
 * - Local: Private key from /opt/ejson/keys/{public_key} (set up via setup script)
 * - CI: Scoped secrets file generated before Playwright starts
 *
 * This keeps secrets.ejson as the single source of truth for all secrets.
 * All fields under `e2e-testing` are automatically loaded - no code changes
 * needed when adding new secrets.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesRoot = fileURLToPath(new URL(".", import.meta.url));
const hydrogenRoot = path.resolve(fixturesRoot, "../..");
const EJSON_DECRYPT_TIMEOUT_MS = 30_000;

/**
 * All secrets from the `e2e-testing` section of secrets.ejson.
 * Access any secret by its snake_case key name from the ejson file.
 *
 * @example
 * // If secrets.ejson has: "e2e-testing": { "gift_card_code_1": "abc123" }
 * const secrets = getTestSecrets();
 * const code = secrets.gift_card_code_1; // "abc123"
 */
export type TestSecrets = Record<string, string>;

let cachedSecrets: TestSecrets | null = null;

/**
 * Loads all secrets from the `e2e-testing` section of secrets.ejson.
 * Secrets are cached after first load.
 *
 * @throws Error if secrets cannot be loaded (ejson not configured)
 */
export function getTestSecrets(): TestSecrets {
  if (cachedSecrets) return cachedSecrets;

  const fromGeneratedFile = loadFromGeneratedFile();
  if (fromGeneratedFile) {
    cachedSecrets = fromGeneratedFile;
    return fromGeneratedFile;
  }

  const fromEjson = loadFromEjson();
  if (fromEjson) {
    cachedSecrets = fromEjson;
    return fromEjson;
  }

  throw new Error(
    "Test secrets not available.\n\n" +
      "Local development:\n" +
      "  Run ./scripts/setup-ejson-private-key.sh to configure ejson\n\n" +
      "CI environment:\n" +
      "  Run hydrate-e2e-env-secrets.ts and set HYDROGEN_E2E_SECRETS_FILE\n",
  );
}

function loadFromGeneratedFile(): TestSecrets | null {
  const configuredPath = process.env.HYDROGEN_E2E_SECRETS_FILE;
  if (!configuredPath) return null;

  const secretsPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(hydrogenRoot, configuredPath);
  if (!existsSync(secretsPath)) return null;

  const parsed: unknown = JSON.parse(readFileSync(secretsPath, "utf8"));
  if (!isObjectRecord(parsed)) return null;

  return extractStringSecrets(parsed);
}

/**
 * Helper to get a required secret, throwing a clear error if missing.
 *
 * @example
 * const code = getRequiredSecret('gift_card_code_1');
 */
export function getRequiredSecret(key: string): string {
  const secrets = getTestSecrets();
  const value = secrets[key];

  if (!value) {
    throw new Error(
      `Required secret "${key}" not found in secrets.ejson e2e-testing section.\n` +
        `Available keys: ${Object.keys(secrets).join(", ") || "(none)"}`,
    );
  }

  return value;
}

/**
 * Returns the loadtest header as a key-value pair for use in Playwright's
 * `extraHTTPHeaders`. Falls back to an empty object if ejson is not configured.
 *
 * WARNING: Any spec that calls `test.use({ extraHTTPHeaders })` must spread
 * these headers, otherwise the loadtest header is silently lost because
 * Playwright replaces (not merges) extraHTTPHeaders.
 */
export function getLoadtestHeaders(): Record<string, string> {
  try {
    const secrets = getTestSecrets();
    const header = secrets.loadtest_header;
    if (header) return { [header]: "true" };
  } catch {
    // The loadtest header is required for customer account OTP bypass —
    // without it, tests fail cryptically minutes later with a redirect timeout.
    console.warn(
      "[loadtest-headers] Failed to load loadtest header from ejson secrets.\n" +
        "Customer account tests will fail without it.\n" +
        "Set up ejson: ./scripts/setup-ejson-private-key.sh",
    );
  }
  return {};
}

function loadFromEjson(): TestSecrets | null {
  const secretsPath = path.resolve(fixturesRoot, "../../secrets.ejson");

  if (!existsSync(secretsPath)) return null;

  try {
    const privateKey = process.env.EJSON_PRIVATE_KEY;

    // If private key provided via env var, use --key-from-stdin
    // Otherwise, rely on keydir (default /opt/ejson/keys)
    const args = privateKey
      ? ["decrypt", "--key-from-stdin", "secrets.ejson"]
      : ["decrypt", "secrets.ejson"];

    const output = execFileSync("ejson", args, {
      cwd: path.dirname(secretsPath),
      encoding: "utf-8",
      input: privateKey, // piped to stdin when --key-from-stdin is set
      stdio: ["pipe", "pipe", "pipe"],
      timeout: EJSON_DECRYPT_TIMEOUT_MS,
    });

    const secrets: unknown = JSON.parse(output);
    if (!isObjectRecord(secrets)) return null;

    const e2eSection = secrets["e2e-testing"];

    if (!isObjectRecord(e2eSection)) return null;

    const e2eSecrets = extractStringSecrets(e2eSection);
    return Object.keys(e2eSecrets).length > 0 ? e2eSecrets : null;
  } catch {
    return null;
  }
}

function extractStringSecrets(record: Record<string, unknown>): TestSecrets {
  const secrets: TestSecrets = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") secrets[key] = value;
  }

  return secrets;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
