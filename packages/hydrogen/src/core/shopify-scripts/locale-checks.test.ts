// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestLogger } from "../test-utils";

let logger: ReturnType<typeof createTestLogger>;
let checks: typeof import("./locale-checks");

function loadPage({ root, pathname = "/" }: { root: string | undefined; pathname?: string }) {
  (window as { Shopify?: unknown }).Shopify = root === undefined ? undefined : { routes: { root } };
  window.history.replaceState({}, "", pathname);
}

beforeEach(async () => {
  // Each check warns once per document, so every test loads the module again.
  vi.resetModules();
  const { configureLogging } = await import("../logging");
  logger = createTestLogger();
  configureLogging({ logger });
  checks = await import("./locale-checks");
});

describe("warnOnMissingLocaleProvider", () => {
  it("warns once when the page is served under a locale path prefix", () => {
    loadPage({ root: "/fr-ca/" });

    checks.warnOnMissingLocaleProvider();
    checks.warnOnMissingLocaleProvider();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/"\/fr-ca".*no LocaleProvider/),
      { scope: "i18n" },
    );
  });

  it.each([
    { page: "the default locale", root: "/" },
    { page: "a page without ShopifyScripts", root: undefined },
  ])("stays quiet on $page", ({ root }) => {
    loadPage({ root });

    checks.warnOnMissingLocaleProvider();

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe("warnOnLocalePathPrefixMismatch", () => {
  it.each([
    {
      root: "/fr-ca/",
      pathPrefix: "/en-ca",
      warning:
        'received the locale path prefix "/en-ca", but the page was loaded with the locale path prefix "/fr-ca"',
    },
    {
      root: "/fr-ca/",
      pathPrefix: "",
      warning:
        'received no locale path prefix, but the page was loaded with the locale path prefix "/fr-ca"',
    },
    {
      root: "/",
      pathPrefix: "/fr-ca",
      warning:
        'received the locale path prefix "/fr-ca", but the page was loaded with no locale path prefix',
    },
  ])(
    "warns when LocaleProvider holds $pathPrefix on a page served under $root",
    ({ root, pathPrefix, warning }) => {
      loadPage({ root });

      checks.warnOnLocalePathPrefixMismatch(pathPrefix);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(warning), {
        scope: "i18n",
      });
    },
  );

  it.each([
    { root: "/fr-ca/", pathPrefix: "/fr-ca" },
    { root: "/fr-ca/", pathPrefix: "/FR-CA" },
    { root: "/", pathPrefix: "" },
    { root: undefined, pathPrefix: "/fr-ca" },
  ])("stays quiet for $pathPrefix on a page served under $root", ({ root, pathPrefix }) => {
    loadPage({ root });

    checks.warnOnLocalePathPrefixMismatch(pathPrefix);

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe("warnOnLocaleChangingNavigation", () => {
  it.each(["/products/snowboard", "/", "/en-ca/products/snowboard", "/fr-cart"])(
    "warns when a navigation to %s leaves the page's locale path prefix",
    (pathname) => {
      loadPage({ root: "/fr-ca/", pathname });

      checks.warnOnLocaleChangingNavigation();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`"${pathname}"`), {
        scope: "i18n",
      });
    },
  );

  it.each([
    { root: "/fr-ca/", pathname: "/fr-ca/products/snowboard" },
    { root: "/fr-ca/", pathname: "/fr-ca" },
    { root: "/fr-ca/", pathname: "/FR-CA/products/snowboard" },
    // Without a prefix on the page, there is nothing to tell a locale prefix from a route.
    { root: "/", pathname: "/fr-ca/products/snowboard" },
    { root: undefined, pathname: "/products/snowboard" },
  ])("stays quiet for a navigation to $pathname on a page served under $root", (page) => {
    loadPage(page);

    checks.warnOnLocaleChangingNavigation();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("reports one locale change per document across the provider and navigation checks", () => {
    loadPage({ root: "/fr-ca/", pathname: "/products/snowboard" });

    checks.warnOnLocaleChangingNavigation();
    checks.warnOnLocalePathPrefixMismatch("");

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
