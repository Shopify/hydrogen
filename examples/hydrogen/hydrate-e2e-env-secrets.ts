#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const HYDROGEN_ROOT = "examples/hydrogen";
const SHARED_EJSON_FILE = "examples/shared/secrets.ejson";
const HYDROGEN_EJSON_FILE = "examples/hydrogen/secrets.ejson";
const SOURCE_E2E_ENVS_DIR = "examples/hydrogen/e2e/envs";
const LOCAL_GENERATED_ROOT = ".tmp";
const DEFAULT_HYDRATED_E2E_ENVS_DIR = ".tmp/e2e-envs";
const DEFAULT_E2E_SECRETS_FILE = ".tmp/e2e-secrets.json";
const CUSTOMER_ACCOUNT_ENV_FILE = ".env.customerAccount";
const ENV_FILE_MODE = 0o600;
const ENV_DIR_MODE = 0o700;
const EJSON_DECRYPT_TIMEOUT_MS = 30_000;

const PRIVATE_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN";
const HYDROGEN_PREVIEW_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN_HYDROGEN_PREVIEW";
const OXYGEN_COOKIE_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN_OXYGEN_COOKIE";

const HYDROGEN_PREVIEW_DOMAINS = new Set([
  "checkout.hydrogen.shop",
  "hydrogen-preview.myshopify.com",
]);
const OXYGEN_COOKIE_DOMAINS = new Set(["oxygencookies.myshopify.com"]);
const NON_CUSTOMER_E2E_SECRET_KEYS = new Set([
  "discount_code_active",
  "discount_code_inactive",
  "gift_card_code_1",
  "gift_card_code_2",
  "loadtest_header",
]);

const decryptedPrivateTokenSecrets = readStringSecrets(decryptSecrets(SHARED_EJSON_FILE));
const e2eTestingSecrets = filterSecrets(
  readE2eTestingSecrets(decryptSecrets(HYDROGEN_EJSON_FILE)),
  NON_CUSTOMER_E2E_SECRET_KEYS,
);
const sourceEnvsDir = resolve(SOURCE_E2E_ENVS_DIR);
const hydratedEnvsDir = resolveHydrogenPath(
  process.env.HYDROGEN_E2E_ENVS_DIR ?? DEFAULT_HYDRATED_E2E_ENVS_DIR,
);
const e2eSecretsFile = resolveHydrogenPath(
  process.env.HYDROGEN_E2E_SECRETS_FILE ?? DEFAULT_E2E_SECRETS_FILE,
);

assertSafeGeneratedDir(hydratedEnvsDir);
assertSafeGeneratedFile(e2eSecretsFile);
rmSync(hydratedEnvsDir, { recursive: true, force: true });
mkdirSync(hydratedEnvsDir, { recursive: true, mode: ENV_DIR_MODE });

for (const entry of readdirSync(sourceEnvsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.startsWith(".env.")) continue;

  const sourcePath = resolve(sourceEnvsDir, entry.name);
  const outputPath = resolve(hydratedEnvsDir, entry.name);

  if (entry.name === CUSTOMER_ACCOUNT_ENV_FILE) {
    copyEnvFile(sourcePath, outputPath);
  } else {
    hydrateEnvFile(sourcePath, outputPath, decryptedPrivateTokenSecrets);
  }
}

writeSecretsFile(e2eSecretsFile, e2eTestingSecrets);

function decryptSecrets(ejsonFile: string): Record<string, unknown> {
  const privateKey = process.env.EJSON_PRIVATE_KEY;
  const hasPrivateKey = privateKey !== undefined && privateKey.length > 0;
  const args = hasPrivateKey ? ["decrypt", "--key-from-stdin", ejsonFile] : ["decrypt", ejsonFile];
  const output = execFileSync("ejson", args, {
    encoding: "utf8",
    input: privateKey,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: EJSON_DECRYPT_TIMEOUT_MS,
  });

  return parseSecretDocument(output, ejsonFile);
}

function parseSecretDocument(output: string, ejsonFile: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(output);
  if (!isObjectRecord(parsed)) {
    throw new Error(`${ejsonFile} did not decrypt to an object`);
  }

  return parsed;
}

function readStringSecrets(secretDocument: Record<string, unknown>): Record<string, string> {
  const secrets: Record<string, string> = {};
  for (const [key, value] of Object.entries(secretDocument)) {
    if (typeof value === "string") secrets[key] = value;
  }

  return secrets;
}

function readE2eTestingSecrets(secretDocument: Record<string, unknown>): Record<string, string> {
  const e2eTestingSection = secretDocument["e2e-testing"];
  if (!isObjectRecord(e2eTestingSection)) {
    throw new Error(`${HYDROGEN_EJSON_FILE} is missing an e2e-testing object`);
  }

  return readStringSecrets(e2eTestingSection);
}

function filterSecrets(
  secrets: Record<string, string>,
  allowedKeys: Set<string>,
): Record<string, string> {
  const filteredSecrets: Record<string, string> = {};
  for (const key of allowedKeys) {
    const value = secrets[key];
    if (value !== undefined) filteredSecrets[key] = value;
  }

  return filteredSecrets;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertSafeGeneratedDir(path: string): void {
  const allowedRoots = getAllowedGeneratedRoots();
  if (allowedRoots.some((root) => path === root)) {
    throw new Error(`Refusing to use generated env directory at root ${path}`);
  }

  if (!allowedRoots.some((root) => isPathInside(root, path))) {
    throw new Error(`Generated env directory must be under ${allowedRoots.join(" or ")}: ${path}`);
  }

  if (path === sourceEnvsDir) {
    throw new Error(
      `Generated env directory must not be the tracked source env directory: ${path}`,
    );
  }
}

function assertSafeGeneratedFile(path: string): void {
  const parentDir = dirname(path);
  const allowedRoots = getAllowedGeneratedRoots();
  if (!allowedRoots.some((root) => parentDir === root || isPathInside(root, parentDir))) {
    throw new Error(`Generated secrets file must be under ${allowedRoots.join(" or ")}: ${path}`);
  }
}

function getAllowedGeneratedRoots(): string[] {
  const roots = [resolveHydrogenPath(LOCAL_GENERATED_ROOT)];
  const runnerTemp = process.env.RUNNER_TEMP;
  if (runnerTemp) roots.push(resolve(runnerTemp));

  return roots;
}

function isPathInside(parent: string, child: string): boolean {
  const relativePath = relative(parent, child);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function copyEnvFile(sourcePath: string, outputPath: string): void {
  copyFileSync(sourcePath, outputPath);
  chmodSync(outputPath, ENV_FILE_MODE);
  process.stderr.write(`Copied ${sourcePath} to ${outputPath}\n`);
}

function hydrateEnvFile(
  sourcePath: string,
  outputPath: string,
  secretValues: Record<string, string>,
): void {
  const contents = readFileSync(sourcePath, "utf8");
  if (readOptionalEnvValue(contents, PRIVATE_TOKEN_KEY) !== undefined) {
    copyFileSync(sourcePath, outputPath);
    chmodSync(outputPath, ENV_FILE_MODE);
    process.stderr.write(
      `Skipped hydration for ${sourcePath}; ${PRIVATE_TOKEN_KEY} already exists\n`,
    );
    return;
  }

  const storeDomain = readEnvValue(contents, "PUBLIC_STORE_DOMAIN");
  const privateToken = getPrivateTokenForStoreDomain(storeDomain, secretValues);
  const nextContents = upsertEnvValue(contents, PRIVATE_TOKEN_KEY, privateToken);

  writeFileSync(outputPath, nextContents, { mode: ENV_FILE_MODE });
  chmodSync(outputPath, ENV_FILE_MODE);
  process.stderr.write(`Hydrated ${sourcePath} to ${outputPath}\n`);
}

function writeSecretsFile(path: string, secrets: Record<string, string>): void {
  mkdirSync(dirname(path), { recursive: true, mode: ENV_DIR_MODE });
  writeFileSync(path, `${JSON.stringify(secrets)}\n`, { mode: ENV_FILE_MODE });
  chmodSync(path, ENV_FILE_MODE);
  process.stderr.write(`Wrote scoped E2E secrets to ${path}\n`);
}

function resolveHydrogenPath(path: string): string {
  if (isAbsolute(path)) return path;

  return resolve(HYDROGEN_ROOT, path);
}

function getPrivateTokenForStoreDomain(
  storeDomain: string,
  secretValues: Record<string, string>,
): string {
  const secretKey = getPrivateTokenSecretKey(storeDomain);
  const privateToken = secretValues[secretKey];
  if (privateToken !== undefined && privateToken.length > 0) return privateToken;

  throw new Error(`Missing ${secretKey} in ${SHARED_EJSON_FILE}`);
}

function getPrivateTokenSecretKey(storeDomain: string): string {
  if (HYDROGEN_PREVIEW_DOMAINS.has(storeDomain)) return HYDROGEN_PREVIEW_TOKEN_KEY;
  if (OXYGEN_COOKIE_DOMAINS.has(storeDomain)) return OXYGEN_COOKIE_TOKEN_KEY;

  throw new Error(`No private token mapping for PUBLIC_STORE_DOMAIN=${storeDomain}`);
}

function readEnvValue(contents: string, key: string): string {
  const value = readOptionalEnvValue(contents, key);
  if (value !== undefined) return value;

  throw new Error(`Missing ${key}`);
}

function readOptionalEnvValue(contents: string, key: string): string | undefined {
  const match = new RegExp(`^${key}=(.*)$`, "m").exec(contents);
  if (!match) return undefined;

  const value = parseEnvValue(match[1]);
  return value.length > 0 ? value : undefined;
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return parseQuotedEnvValue(trimmed);

  return trimmed;
}

function parseQuotedEnvValue(value: string): string {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed === "string") return parsed;

  throw new Error(`Expected quoted env value to parse to a string: ${value}`);
}

function upsertEnvValue(contents: string, key: string, value: string): string {
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) return contents.replace(pattern, line);

  return `${contents.replace(/\s*$/, "")}\n${line}\n`;
}
