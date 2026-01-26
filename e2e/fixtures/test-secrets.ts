/**
 * Test secrets loading module.
 *
 * Retrieves E2E test secrets via EJSON decryption. Uses a single code path
 * for both local development and CI:
 *
 * - Local: Private key from /opt/ejson/keys/{public_key} (set up via setup script)
 * - CI: Private key from EJSON_PRIVATE_KEY env var, passed via --key-from-stdin
 *
 * This keeps secrets.ejson as the single source of truth for all secrets.
 * All fields under `e2e-testing` are automatically loaded - no code changes
 * needed when adding new secrets.
 */

import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

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

  const fromEjson = loadFromEjson();
  if (fromEjson) {
    cachedSecrets = fromEjson;
    return fromEjson;
  }

  throw new Error(
    'Test secrets not available.\n\n' +
      'Local development:\n' +
      '  Run ./scripts/setup-ejson-private-key.sh to configure ejson\n\n' +
      'CI environment:\n' +
      '  Set EJSON_PRIVATE_KEY environment variable\n',
  );
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
        `Available keys: ${Object.keys(secrets).join(', ') || '(none)'}`,
    );
  }

  return value;
}

function loadFromEjson(): TestSecrets | null {
  const secretsPath = path.resolve(__dirname, '../../secrets.ejson');

  if (!existsSync(secretsPath)) return null;

  try {
    const privateKey = process.env.EJSON_PRIVATE_KEY;

    // If private key provided via env var, use --key-from-stdin
    // Otherwise, rely on keydir (default /opt/ejson/keys)
    const args = privateKey
      ? ['decrypt', '--key-from-stdin', 'secrets.ejson']
      : ['decrypt', 'secrets.ejson'];

    const output = execFileSync('ejson', args, {
      cwd: path.dirname(secretsPath),
      encoding: 'utf-8',
      input: privateKey, // piped to stdin when --key-from-stdin is set
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const secrets = JSON.parse(output) as Record<string, unknown>;
    const e2eSection = secrets['e2e-testing'];

    if (!e2eSection || typeof e2eSection !== 'object') return null;

    // Filter to only string values (the actual secrets)
    const e2eSecrets: TestSecrets = {};
    for (const [key, value] of Object.entries(e2eSection)) {
      if (typeof value === 'string') {
        e2eSecrets[key] = value;
      }
    }

    return Object.keys(e2eSecrets).length > 0 ? e2eSecrets : null;
  } catch {
    return null;
  }
}
