import { describe, expect, it, vi } from "vitest";

import {
  configureCustomerAccountUrls,
  formatCustomerAccountSettings,
  resolveCustomerAccountUrls,
} from "./customer-account";

const ROOT = "/project";
const URLS = resolveCustomerAccountUrls("local.tryhydrogen.dev", 5_173);

describe("resolveCustomerAccountUrls", () => {
  it("keeps the JavaScript origin portless", () => {
    expect(URLS).toEqual({
      callbackUri: "https://local.tryhydrogen.dev:5173/account/authorize",
      devOrigin: "https://local.tryhydrogen.dev:5173",
      javascriptOrigin: "https://local.tryhydrogen.dev",
      logoutUri: "https://local.tryhydrogen.dev:5173",
    });
  });
});

describe("formatCustomerAccountSettings", () => {
  it("prints all manual Customer Account API values", () => {
    const output = formatCustomerAccountSettings(URLS);

    expect(output).toContain(URLS.callbackUri);
    expect(output).toContain(`JavaScript origin(s):        ${URLS.javascriptOrigin}\n`);
    expect(output).toContain(`Logout URI:                  ${URLS.logoutUri}`);
  });
});

describe("configureCustomerAccountUrls", () => {
  it("skips all Shopify CLI commands in CI and prints manual values", async () => {
    const { logger, runShopifyCommand } = setup();

    await configureCustomerAccountUrls(
      { logger, root: ROOT, urls: URLS },
      { isCI: () => true, runShopifyCommand },
    );

    expect(runShopifyCommand).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(URLS.callbackUri));
  });

  it("instructs users to update Shopify CLI when Hydrogen CLI is too old", async () => {
    const { logger, runShopifyCommand } = setup({ version: "13.0.3" });

    await configureCustomerAccountUrls(
      { logger, root: ROOT, urls: URLS },
      { isCI: () => false, runShopifyCommand },
    );

    expect(runShopifyCommand).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("13.0.4 or later"));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("@shopify/cli@latest"));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(URLS.callbackUri));
  });

  it("links an unlinked project before pushing the derived origins", async () => {
    let linked = false;
    const hasLinkedStorefront = vi.fn(async () => linked);
    const { logger, runShopifyCommand } = setup({
      onCommand(args) {
        if (args[1] === "link") linked = true;
      },
    });

    await configureCustomerAccountUrls(
      { logger, root: ROOT, urls: URLS },
      { hasLinkedStorefront, isCI: () => false, runShopifyCommand },
    );

    expect(runShopifyCommand.mock.calls.map(([args]) => args)).toEqual([
      ["plugins", "--core", "--json"],
      ["hydrogen", "link", "--path", ROOT],
      [
        "hydrogen",
        "customer-account-push",
        "--path",
        ROOT,
        "--dev-origin",
        URLS.devOrigin,
        "--javascript-origin",
        URLS.javascriptOrigin,
      ],
    ]);
    expect(hasLinkedStorefront).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      `Customer Account API settings updated for ${URLS.devOrigin}.`,
    );
  });

  it("pushes without linking when the project is already linked", async () => {
    const { logger, runShopifyCommand } = setup();

    await configureCustomerAccountUrls(
      { logger, root: ROOT, urls: URLS },
      {
        hasLinkedStorefront: async () => true,
        isCI: () => false,
        runShopifyCommand,
      },
    );

    expect(runShopifyCommand.mock.calls.map(([args]) => args)).toEqual([
      ["plugins", "--core", "--json"],
      expect.arrayContaining(["customer-account-push"]),
    ]);
  });

  it("warns with manual values and keeps going when linking is cancelled", async () => {
    const { logger, runShopifyCommand } = setup();

    await configureCustomerAccountUrls(
      { logger, root: ROOT, urls: URLS },
      {
        hasLinkedStorefront: async () => false,
        isCI: () => false,
        runShopifyCommand,
      },
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("finished without linking a Hydrogen storefront"),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(URLS.callbackUri));
  });

  it("warns with manual values when the push fails", async () => {
    const { logger, runShopifyCommand } = setup({
      onCommand(args) {
        if (args.includes("customer-account-push")) throw new Error("access denied");
      },
    });

    await configureCustomerAccountUrls(
      { logger, root: ROOT, urls: URLS },
      {
        hasLinkedStorefront: async () => true,
        isCI: () => false,
        runShopifyCommand,
      },
    );

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("access denied"));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(URLS.callbackUri));
  });
});

function setup({
  version = "13.0.4",
  onCommand,
}: { version?: string; onCommand?: (args: string[]) => void } = {}) {
  const logger = { info: vi.fn(), warn: vi.fn() };
  const runShopifyCommand = vi.fn(async (args: string[]) => {
    onCommand?.(args);
    if (args[0] !== "plugins") return "";

    return JSON.stringify([
      {
        pjson: {
          name: "@shopify/cli",
          devDependencies: { "@shopify/cli-hydrogen": version },
        },
      },
    ]);
  });

  return { logger, runShopifyCommand };
}
