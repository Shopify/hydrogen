// @vitest-environment happy-dom
import { render, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { configureLogging } from "../core/logging";
import { createTestLogger } from "../core/test-utils";
import { LocaleProvider, useLocale } from "./locale";

const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;
const EN_CA = { language: "EN", country: "CA", pathPrefix: "/en-ca" } as const;

afterEach(() => {
  configureLogging({});
  delete (window as { Shopify?: unknown }).Shopify;
});

describe("useLocale", () => {
  it("returns the locale from LocaleProvider", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(LocaleProvider, { locale: FR_CA }, children),
    });

    expect(result.current).toBe(FR_CA);
  });

  it("throws outside LocaleProvider", () => {
    expect(() => renderHook(() => useLocale())).toThrow(
      "useLocale must be used inside <LocaleProvider>.",
    );
  });
});

describe("LocaleProvider", () => {
  it("warns in development when its locale differs from the locale of the page", () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    (window as { Shopify?: unknown }).Shopify = { routes: { root: "/fr-ca/" } };

    render(createElement(LocaleProvider, { locale: EN_CA }));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"/en-ca"'), {
      scope: "i18n",
    });
  });
});
