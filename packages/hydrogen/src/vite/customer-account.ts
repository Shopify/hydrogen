import { readFile } from "node:fs/promises";
import { join } from "node:path";

import spawn from "cross-spawn";

const CUSTOMER_ACCOUNT_AUTHORIZE_PATH = "/account/authorize";
const MINIMUM_HYDROGEN_CLI_VERSION = "13.0.4";
const SUCCESS_EXIT_CODE = 0;

type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

type RunShopifyCommand = (
  args: string[],
  options: { captureOutput?: boolean; cwd: string },
) => Promise<string>;

type CustomerAccountSetupDependencies = {
  hasLinkedStorefront?: (root: string) => Promise<boolean>;
  isCI?: () => boolean;
  runShopifyCommand?: RunShopifyCommand;
};

export type CustomerAccountUrls = {
  callbackUri: string;
  devOrigin: string;
  javascriptOrigin: string;
  logoutUri: string;
};

export function resolveCustomerAccountUrls(host: string, port: number): CustomerAccountUrls {
  const javascriptOrigin = `https://${host}`;
  const devOrigin = `${javascriptOrigin}:${port}`;

  return {
    callbackUri: `${devOrigin}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}`,
    devOrigin,
    javascriptOrigin,
    logoutUri: devOrigin,
  };
}

export function formatCustomerAccountSettings(urls: CustomerAccountUrls) {
  return [
    "",
    "Customer Account API - configure these values for your storefront:",
    "",
    `  Callback URI(s) (required):  ${urls.callbackUri}`,
    `  JavaScript origin(s):        ${urls.javascriptOrigin}`,
    `  Logout URI:                  ${urls.logoutUri}`,
    "",
  ].join("\n");
}

export function isContinuousIntegration() {
  const ci = process.env.CI;
  return ci !== undefined && ci !== "" && ci !== "false" && ci !== "0";
}

export async function configureCustomerAccountUrls(
  {
    logger,
    root,
    urls,
  }: {
    logger: Logger;
    root: string;
    urls: CustomerAccountUrls;
  },
  dependencies: CustomerAccountSetupDependencies = {},
) {
  const isCI = dependencies.isCI ?? isContinuousIntegration;
  if (isCI()) {
    logger.info(formatCustomerAccountSettings(urls));
    return;
  }

  const runCommand = dependencies.runShopifyCommand ?? runShopifyCommand;

  try {
    await requireCompatibleShopifyCli(root, runCommand);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(
      [
        "Automatic Customer Account API setup was skipped.",
        reason,
        "Install the latest Shopify CLI and restart the development server:",
        "  npm install -g @shopify/cli@latest",
        formatCustomerAccountSettings(urls),
      ].join("\n"),
    );
    return;
  }

  const hasLinkedStorefront = dependencies.hasLinkedStorefront ?? projectHasLinkedStorefront;

  try {
    if (!(await hasLinkedStorefront(root))) {
      logger.info("No linked Hydrogen storefront found. Starting Shopify CLI linking...");
      await runCommand(["hydrogen", "link", "--path", root], { cwd: root });

      if (!(await hasLinkedStorefront(root))) {
        throw new Error("Shopify CLI finished without linking a Hydrogen storefront.");
      }
    }

    logger.info("Updating Customer Account API settings with Shopify CLI...");
    await runCommand(
      [
        "hydrogen",
        "customer-account-push",
        "--path",
        root,
        "--dev-origin",
        urls.devOrigin,
        "--javascript-origin",
        urls.javascriptOrigin,
      ],
      { cwd: root },
    );
    logger.info(`Customer Account API settings updated for ${urls.devOrigin}.`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(
      [
        "Local HTTPS is ready, but Customer Account API setup could not be completed:",
        `  ${reason}`,
        formatCustomerAccountSettings(urls),
      ].join("\n"),
    );
  }
}

class ShopifyCliRequirementError extends Error {}

async function requireCompatibleShopifyCli(root: string, runCommand: RunShopifyCommand) {
  const hydrogenCliVersion = await getHydrogenCliVersion(root, runCommand);
  if (!isVersionAtLeast(hydrogenCliVersion, MINIMUM_HYDROGEN_CLI_VERSION)) {
    throw new ShopifyCliRequirementError(
      `Found @shopify/cli-hydrogen ${hydrogenCliVersion}; ${MINIMUM_HYDROGEN_CLI_VERSION} or later is required.`,
    );
  }
}

async function getHydrogenCliVersion(root: string, runCommand: RunShopifyCommand) {
  let output: string;
  try {
    output = await runCommand(["plugins", "--core", "--json"], {
      captureOutput: true,
      cwd: root,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ShopifyCliRequirementError(
      `A compatible Shopify CLI installation was not found. ${reason}`,
    );
  }

  let plugins: unknown;
  try {
    plugins = JSON.parse(output);
  } catch {
    throw new ShopifyCliRequirementError(
      "Shopify CLI did not return valid plugin version information.",
    );
  }

  if (!Array.isArray(plugins)) {
    throw new ShopifyCliRequirementError("Shopify CLI did not return plugin version information.");
  }

  for (const plugin of plugins) {
    if (!isRecord(plugin)) continue;
    const packageJson = plugin.pjson;
    if (!isRecord(packageJson) || packageJson.name !== "@shopify/cli") continue;

    const devDependencies = packageJson.devDependencies;
    if (!isRecord(devDependencies)) break;

    const version = devDependencies["@shopify/cli-hydrogen"];
    if (typeof version === "string") return version;
    break;
  }

  throw new ShopifyCliRequirementError(
    "The installed Shopify CLI does not include @shopify/cli-hydrogen.",
  );
}

function isVersionAtLeast(version: string, minimum: string) {
  const parsedVersion = parseVersion(version);
  const parsedMinimum = parseVersion(minimum);
  if (!parsedVersion || !parsedMinimum) return false;

  for (let index = 0; index < parsedMinimum.numbers.length; index += 1) {
    const difference = parsedVersion.numbers[index] - parsedMinimum.numbers[index];
    if (difference !== 0) return difference > 0;
  }

  return parsedVersion.prerelease === undefined;
}

function parseVersion(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+.+)?$/.exec(version);
  if (!match) return;

  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4],
  };
}

async function projectHasLinkedStorefront(root: string) {
  try {
    const project = JSON.parse(await readFile(join(root, ".shopify", "project.json"), "utf8"));
    return (
      isRecord(project) &&
      isRecord(project.storefront) &&
      typeof project.storefront.id === "string" &&
      project.storefront.id !== ""
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function runShopifyCommand(
  args: string[],
  { captureOutput = false, cwd }: { captureOutput?: boolean; cwd: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("shopify", args, {
      cwd,
      shell: false,
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    let errorOutput = "";

    const collect = (target: "output" | "errorOutput") => (chunk: Buffer) => {
      if (target === "output") output += chunk.toString();
      else errorOutput += chunk.toString();
    };

    child.stdout?.on("data", collect("output"));
    child.stderr?.on("data", collect("errorOutput"));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === SUCCESS_EXIT_CODE) {
        resolve(output);
        return;
      }

      const reason = signal ? `was killed by ${signal}` : `exited with code ${code}`;
      const detail = errorOutput.trim();
      reject(new Error(`shopify ${args.join(" ")} ${reason}${detail ? `\n${detail}` : ""}`));
    });
  });
}
