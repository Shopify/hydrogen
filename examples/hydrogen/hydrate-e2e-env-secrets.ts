#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EJSON_FILE = "examples/shared/secrets.ejson";
const E2E_ENVS_DIR = "examples/hydrogen/e2e/envs";
const CUSTOMER_ACCOUNT_ENV_FILE = ".env.customerAccount";
const ENV_FILE_MODE = 0o600;

const PRIVATE_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN";
const HYDROGEN_PREVIEW_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN_HYDROGEN_PREVIEW";
const OXYGEN_COOKIE_TOKEN_KEY = "PRIVATE_STOREFRONT_API_TOKEN_OXYGEN_COOKIE";

const HYDROGEN_PREVIEW_DOMAINS = new Set([
  "checkout.hydrogen.shop",
  "hydrogen-preview.myshopify.com",
]);
const OXYGEN_COOKIE_DOMAINS = new Set(["oxygencookies.myshopify.com"]);

const decryptedSecrets = decryptSecrets();
const envsDir = resolve(E2E_ENVS_DIR);

for (const entry of readdirSync(envsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.startsWith(".env.")) continue;
  if (entry.name === CUSTOMER_ACCOUNT_ENV_FILE) continue;

  hydrateEnvFile(resolve(envsDir, entry.name), decryptedSecrets);
}

function decryptSecrets(): Record<string, string> {
  const privateKey = process.env.EJSON_PRIVATE_KEY;
  const hasPrivateKey = privateKey !== undefined && privateKey.length > 0;
  const args = hasPrivateKey
    ? ["decrypt", "--key-from-stdin", EJSON_FILE]
    : ["decrypt", EJSON_FILE];
  const output = execFileSync("ejson", args, {
    encoding: "utf8",
    input: privateKey,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return parseSecrets(output);
}

function parseSecrets(output: string): Record<string, string> {
  const parsed: unknown = JSON.parse(output);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`${EJSON_FILE} did not decrypt to an object`);
  }

  const parsedSecrets: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") parsedSecrets[key] = value;
  }

  return parsedSecrets;
}

function hydrateEnvFile(path: string, secretValues: Record<string, string>): void {
  const contents = readFileSync(path, "utf8");
  if (readOptionalEnvValue(contents, PRIVATE_TOKEN_KEY) !== undefined) {
    process.stderr.write(`Skipped ${path}; ${PRIVATE_TOKEN_KEY} already exists\n`);
    return;
  }

  const storeDomain = readEnvValue(contents, "PUBLIC_STORE_DOMAIN");
  const privateToken = getPrivateTokenForStoreDomain(storeDomain, secretValues);
  const nextContents = upsertEnvValue(contents, PRIVATE_TOKEN_KEY, privateToken);

  writeFileSync(path, nextContents, { mode: ENV_FILE_MODE });
  chmodSync(path, ENV_FILE_MODE);
  process.stderr.write(`Hydrated ${path}\n`);
}

function getPrivateTokenForStoreDomain(
  storeDomain: string,
  secretValues: Record<string, string>,
): string {
  const secretKey = getPrivateTokenSecretKey(storeDomain);
  const privateToken = secretValues[secretKey];
  if (privateToken !== undefined && privateToken.length > 0) return privateToken;

  throw new Error(`Missing ${secretKey} in ${EJSON_FILE}`);
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
