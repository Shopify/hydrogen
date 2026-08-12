#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { customerAccountConfig, shop, storefrontConfig } from "../examples/shared/config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sharedDir = resolve(root, "examples/shared");
const ejsonFile = "secrets.ejson";
const generatedExampleEnvStart = "# BEGIN generated example env";
const generatedExampleEnvEnd = "# END generated example env";
const generatedEnvStart = "# BEGIN generated example secrets";
const generatedEnvEnd = "# END generated example secrets";
const privateStorefrontTokenEnvKey = "PRIVATE_STOREFRONT_API_TOKEN";

const privateStorefrontTokenSourceKeys = new Set<string>([
  "PRIVATE_STOREFRONT_API_TOKEN_HYDROGEN_PREVIEW",
  "PRIVATE_STOREFRONT_API_TOKEN_OXYGEN_COOKIE",
]);

type EnvFileTarget = {
  path: string;
  examplePath: string;
  legacyPath: string;
  values?: Record<string, string>;
};

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
  const envSecrets = getEnvSecrets(secrets);

  for (const envFileTarget of getEnvFileTargets()) {
    assertEnvFileIgnored(envFileTarget.path);
    updateEnvFile(envFileTarget, { ...envSecrets, ...envFileTarget.values });
    process.stderr.write(`Wrote ${envFileTarget.path}\n`);
  }
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

function getEnvSecrets(secrets: Record<string, string>): Record<string, string> {
  const privateStorefrontToken = secrets[storefrontConfig.privateStorefrontTokenEnvKey];
  if (!privateStorefrontToken) {
    throw new Error(
      `Missing ${storefrontConfig.privateStorefrontTokenEnvKey} in examples/shared/${ejsonFile}`,
    );
  }

  return {
    ...Object.fromEntries(
      Object.entries(secrets).filter(
        ([key]) => key !== "_public_key" && !privateStorefrontTokenSourceKeys.has(key),
      ),
    ),
    [privateStorefrontTokenEnvKey]: privateStorefrontToken,
  };
}

function getEnvFileTargets(): EnvFileTarget[] {
  return [...getExampleEnvFileTargets(), ...getTemplateEnvFileTargets()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
}

function getExampleEnvFileTargets(): EnvFileTarget[] {
  const examplesDir = resolve(root, "examples");
  const envFileTargets: EnvFileTarget[] = [];

  for (const entry of readdirSync(examplesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "shared") continue;

    const packageJsonPath = resolve(examplesDir, entry.name, "package.json");
    if (!existsSync(packageJsonPath)) continue;

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    if (packageJson.scripts?.dev) {
      envFileTargets.push(createEnvFileTarget(resolve(examplesDir, entry.name)));
    }
  }

  return envFileTargets;
}

function getTemplateEnvFileTargets(): EnvFileTarget[] {
  const templatesDir = resolve(root, "templates");

  return [
    createEnvFileTarget(resolve(templatesDir, "react-router"), {
      PUBLIC_STORE_DOMAIN: storefrontConfig.storeDomain,
    }),
    createEnvFileTarget(resolve(templatesDir, "nextjs"), {
      SESSION_SECRET: customerAccountConfig.sessionSecret,
      NEXT_PUBLIC_STORE_DOMAIN: storefrontConfig.storeDomain,
      NEXT_PUBLIC_STOREFRONT_API_TOKEN: storefrontConfig.publicStorefrontToken || "",
      NEXT_PUBLIC_SHOP_ID: customerAccountConfig.shopId,
      NEXT_PUBLIC_STOREFRONT_ID: shop.storefrontId,
      NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: customerAccountConfig.customerAccountApiClientId,
    }),
  ];
}

function createEnvFileTarget(projectDir: string, values?: Record<string, string>): EnvFileTarget {
  return {
    path: resolve(projectDir, ".env"),
    examplePath: resolve(projectDir, ".env.example"),
    legacyPath: resolve(projectDir, ".env.local"),
    values,
  };
}

function assertEnvFileIgnored(path: string): void {
  const relativePath = relative(root, path);

  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", relativePath], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    throw new Error(`Refusing to write ${relativePath} because Git does not ignore it.`);
  }
}

function formatGeneratedSecretsBlock(secrets: Record<string, string>): string {
  const entries = Object.entries(secrets)
    .filter(([key]) => key !== "_public_key")
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n");

  return `${generatedEnvStart}\n${entries}\n${generatedEnvEnd}\n`;
}

function updateEnvFile(envFileTarget: EnvFileTarget, secrets: Record<string, string>): void {
  const existing = existsSync(envFileTarget.path) ? readFileSync(envFileTarget.path, "utf8") : "";
  const exampleBlock = formatGeneratedExampleEnvBlock(envFileTarget.examplePath, secrets);
  const withExampleBlock = exampleBlock
    ? upsertGeneratedBlock(existing, generatedExampleEnvStart, generatedExampleEnvEnd, exampleBlock)
    : existing;
  const secretsBlock = exampleBlock ? "" : formatGeneratedSecretsBlock(secrets);
  const contents = secretsBlock
    ? upsertGeneratedBlock(withExampleBlock, generatedEnvStart, generatedEnvEnd, secretsBlock)
    : removeGeneratedBlock(withExampleBlock, generatedEnvStart, generatedEnvEnd);

  writeFileSync(envFileTarget.path, contents, { mode: 0o600 });
  chmodSync(envFileTarget.path, 0o600);
  cleanupLegacyEnvFile(envFileTarget.legacyPath);
}

function cleanupLegacyEnvFile(path: string): void {
  if (!existsSync(path)) return;

  const existing = readFileSync(path, "utf8");
  const contents = removeGeneratedBlock(
    removeGeneratedBlock(existing, generatedExampleEnvStart, generatedExampleEnvEnd),
    generatedEnvStart,
    generatedEnvEnd,
  );

  if (contents.trim()) {
    writeFileSync(path, contents, { mode: 0o600 });
    chmodSync(path, 0o600);
  } else {
    unlinkSync(path);
  }
}

function formatGeneratedExampleEnvBlock(
  examplePath: string,
  secrets: Record<string, string>,
): string | undefined {
  if (!existsSync(examplePath)) return undefined;
  const merged = mergeEnvContents(readFileSync(examplePath, "utf8"), secrets);
  return `${generatedExampleEnvStart}\n${merged.trim()}\n${generatedExampleEnvEnd}\n`;
}

function mergeEnvContents(contents: string, values: Record<string, string>): string {
  const remainingValues = new Map(Object.entries(values).filter(([key]) => key !== "_public_key"));
  const lines = contents.split(/\r?\n/).map((line) => {
    const match = /^(\s*)([A-Z_a-z][A-Z_a-z0-9]*)(\s*=\s*)(.*)$/.exec(line);
    if (!match) return line;

    const [, leadingWhitespace, key, separator] = match;
    const value = remainingValues.get(key);
    if (value === undefined) return line;

    remainingValues.delete(key);
    return `${leadingWhitespace}${key}${separator}${JSON.stringify(value)}`;
  });

  for (const [key, value] of remainingValues) {
    lines.push(`${key}=${JSON.stringify(value)}`);
  }

  return lines.join("\n");
}

function upsertGeneratedBlock(
  existing: string,
  blockStart: string,
  blockEnd: string,
  block: string,
): string {
  const generatedBlockPattern = new RegExp(
    `${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}\\n?`,
  );
  return generatedBlockPattern.test(existing)
    ? existing.replace(generatedBlockPattern, block)
    : appendBlock(existing, block);
}

function removeGeneratedBlock(existing: string, blockStart: string, blockEnd: string): string {
  const generatedBlockPattern = new RegExp(
    `${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}\\n?`,
  );
  return existing.replace(generatedBlockPattern, "").replace(/\s*$/, existing ? "\n" : "");
}

function appendBlock(existing: string, envBlock: string): string {
  if (!existing) return envBlock;
  return `${existing.replace(/\s*$/, "")}\n\n${envBlock}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
