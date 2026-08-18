import { afterEach, describe, expect, it } from "vitest";

import { configureLogging, resetLoggingForTests } from "../logging";
import { createTestLogger } from "../test-utils";
import { LOCALIZATION_SESSION_KEY } from "./constants";
import type { MatchedLocale } from "./locale-matching";
import { getLocaleRedirect } from "./locale-redirect";

const DEFAULT_I18N: MatchedLocale = { country: "US", language: "EN", pathPrefix: "" };
const FR_CA_SESSION_LOCALE = { country: "CA", language: "FR" };

function createSessionManager(localeValue: unknown) {
  return {
    getSessionItem(key: string) {
      return key === LOCALIZATION_SESSION_KEY ? localeValue : undefined;
    },
  };
}

function requestFor(path: string): Request {
  return new Request(`https://store.example${path}`);
}

afterEach(() => {
  resetLoggingForTests();
});

describe("getLocaleRedirect", () => {
  it("redirects an unprefixed request to the session locale's prefixed URL", async () => {
    const response = await getLocaleRedirect(requestFor("/collections/shoes?sort=price"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager(FR_CA_SESSION_LOCALE),
    });

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe("/fr-ca/collections/shoes?sort=price");
  });

  it("marks redirects as uncacheable by shared caches", async () => {
    const response = await getLocaleRedirect(requestFor("/"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager(FR_CA_SESSION_LOCALE),
    });

    expect(response?.headers.get("cache-control")).toBe("private, no-store");
  });

  it("redirects the root path without a trailing slash", async () => {
    const response = await getLocaleRedirect(requestFor("/"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager(FR_CA_SESSION_LOCALE),
    });

    expect(response?.headers.get("location")).toBe("/fr-ca");
  });

  it("never redirects prefixed URLs — the URL always wins", async () => {
    const response = await getLocaleRedirect(requestFor("/en-ca/products"), {
      i18n: { country: "CA", language: "EN", pathPrefix: "/en-ca" },
      sessionManager: createSessionManager(FR_CA_SESSION_LOCALE),
    });

    expect(response).toBeNull();
  });

  it("returns null when the session has no locale", async () => {
    const response = await getLocaleRedirect(requestFor("/products"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager(undefined),
    });

    expect(response).toBeNull();
  });

  it("returns null when the session locale matches the resolved default", async () => {
    const response = await getLocaleRedirect(requestFor("/products"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager({ country: "US", language: "EN" }),
    });

    expect(response).toBeNull();
  });

  it("supports async session managers", async () => {
    const response = await getLocaleRedirect(requestFor("/products"), {
      i18n: DEFAULT_I18N,
      sessionManager: {
        getSessionItem: () => Promise.resolve(FR_CA_SESSION_LOCALE),
      },
    });

    expect(response?.headers.get("location")).toBe("/fr-ca/products");
  });

  it("uses resolveLocaleUrl when provided", async () => {
    const response = await getLocaleRedirect(requestFor("/products?a=1"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager(FR_CA_SESSION_LOCALE),
      resolveLocaleUrl: ({ locale, path }) =>
        new URL(path, `https://${locale.country.toLowerCase()}.store.example`),
    });

    expect(response?.headers.get("location")).toBe("https://ca.store.example/products?a=1");
  });

  it.each([
    ["a non-object", "fr-CA"],
    ["a partial object", { country: "CA" }],
    ["invalid codes", { country: "QQ", language: "FR" }],
    ["non-string fields", { country: 1, language: true }],
  ])("degrades to no redirect and warns for %s session value", async (_name, localeValue) => {
    const logger = createTestLogger();
    configureLogging({ logger });

    const response = await getLocaleRedirect(requestFor("/products"), {
      i18n: DEFAULT_I18N,
      sessionManager: createSessionManager(localeValue),
    });

    expect(response).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "ignoring malformed locale session value",
      expect.objectContaining({ scope: "localization" }),
    );
  });

  it("degrades to no redirect and logs when the session read throws", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const sessionReadError = new Error("decryption failed");

    const response = await getLocaleRedirect(requestFor("/products"), {
      i18n: DEFAULT_I18N,
      sessionManager: {
        getSessionItem: () => {
          throw sessionReadError;
        },
      },
    });

    expect(response).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      "locale session read failed",
      expect.objectContaining({ scope: "localization", error: sessionReadError }),
    );
  });
});
