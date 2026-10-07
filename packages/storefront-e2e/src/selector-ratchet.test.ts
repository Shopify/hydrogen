import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  compareWithAllowlist,
  findSelectorViolations,
  formatRatchetResult,
  isScannedFile,
  SCANNED_DIRECTORIES,
  type SelectorViolation,
} from "./selector-ratchet";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_PATH = join(PACKAGE_ROOT, "src/selector-ratchet-allowlist.json");

function scanPackage(): SelectorViolation[] {
  const files = SCANNED_DIRECTORIES.flatMap((directory) =>
    readdirSync(join(PACKAGE_ROOT, directory), { recursive: true, encoding: "utf8" }).map(
      (file) => `${directory}/${file.split("\\").join("/")}`,
    ),
  )
    .filter(isScannedFile)
    .toSorted();

  return files.flatMap((file) =>
    findSelectorViolations(file, readFileSync(join(PACKAGE_ROOT, file), "utf8")),
  );
}

describe("findSelectorViolations", () => {
  it.each([
    ['page.getByRole("button")', "get-by-locator"],
    ['page.getByText("Sale")', "get-by-locator"],
    ['page.getByLabel("Email")', "get-by-locator"],
    ['page.getByPlaceholder("Search")', "get-by-locator"],
    ['page.getByAltText("Logo")', "get-by-locator"],
    ['page.getByTitle("Close")', "get-by-locator"],
    ['page.getByTestId("cart")', "get-by-locator"],
    ['page.locator("button")', "raw-locator"],
    ['"xpath=ancestor::form[1]"', "xpath"],
    ['page.$eval("a", (a) => a)', "dom-evaluate"],
    ['page.$$eval("a", (all) => all.length)', "dom-evaluate"],
    ['document.querySelectorAll<HTMLAnchorElement>("a")', "dom-query"],
    ['document.getElementById("cart")', "dom-query"],
    ['element.closest("form")', "dom-query"],
    ["document.body.textContent", "dom-query"],
    ["document.documentElement.lang", "dom-query"],
  ])("detects %s", (code, rule) => {
    expect(findSelectorViolations("specs/example.spec.ts", code)).toEqual([
      { file: "specs/example.spec.ts", rule, code },
    ]);
  });

  it("records each call on one line", () => {
    const code = 'page.getByRole("dialog").getByRole("listitem")';

    expect(findSelectorViolations("specs/example.spec.ts", code)).toHaveLength(2);
  });

  it.each([
    ['page.getByRole\n  ("button")', "get-by-locator", "page.getByRole"],
    ['page\n  .locator\n  ("button")', "raw-locator", ".locator"],
    [
      'document.querySelectorAll<HTMLAnchorElement>\n("a")',
      "dom-query",
      "document.querySelectorAll<HTMLAnchorElement>",
    ],
  ])("detects a call split across lines: %j", (source, rule, code) => {
    expect(findSelectorViolations("specs/example.spec.ts", source)).toEqual([
      { file: "specs/example.spec.ts", rule, code },
    ]);
  });

  it.each([
    "page.evaluate(() => 1)",
    "page.evaluate(() => window.events)",
    "page.evaluate<\n  number\n>(() => 1)",
    "page.evaluateHandle(() => window)",
    "locator.evaluate((element) => element.textContent)",
    "locator.evaluateAll((all) => all.length)",
    'page.evaluate(() => document.addEventListener("cart:update", record))',
  ])("allows non-DOM evaluation: %j", (source) => {
    expect(findSelectorViolations("specs/example.spec.ts", source)).toEqual([]);
  });

  it("rejects a DOM query inside page.evaluate", () => {
    const source = 'page.evaluate(() => document.querySelector("a")?.href)';

    expect(findSelectorViolations("specs/example.spec.ts", source)).toEqual([
      { file: "specs/example.spec.ts", rule: "dom-query", code: source },
    ]);
  });

  it("rejects a typed DOM query in a multiline page.evaluate callback", () => {
    const source = [
      "return page.evaluate<string[]>(",
      "  () =>",
      "    [...document.querySelectorAll<",
      "      HTMLAnchorElement",
      '    >("a[href]")].map((link) => link.href),',
      ");",
    ].join("\n");

    expect(findSelectorViolations("specs/example.spec.ts", source)).toEqual([
      {
        file: "specs/example.spec.ts",
        rule: "dom-query",
        code: "[...document.querySelectorAll<",
      },
    ]);
  });

  it("records each match on the trimmed line where it starts", () => {
    const source = ["const line = page", '  .getByRole("main")', '  .getByRole("listitem");'].join(
      "\n",
    );

    expect(findSelectorViolations("specs/example.spec.ts", source).map(({ code }) => code)).toEqual(
      ['.getByRole("main")', '.getByRole("listitem");'],
    );
  });

  it("ignores signifier lookups and plain text", () => {
    const source = [
      'const addToCart = await requireH3(page, "product-add-to-cart", { available: true });',
      "// Prefer role locators only when no signifier exists.",
    ].join("\n");

    expect(findSelectorViolations("specs/example.spec.ts", source)).toEqual([]);
  });
});

describe("isScannedFile", () => {
  it("scans production sources and specs but not tests or the signifier module", () => {
    expect(isScannedFile("src/contract.ts")).toBe(true);
    expect(isScannedFile("src/helper.tsx")).toBe(true);
    expect(isScannedFile("specs/cart/helper.mts")).toBe(true);
    expect(isScannedFile("src/helper.test.tsx")).toBe(false);
    expect(isScannedFile("src/helper.test.mts")).toBe(false);
    expect(isScannedFile("specs/cart/cart.spec.ts")).toBe(true);
    expect(isScannedFile("src/signifiers.ts")).toBe(false);
    expect(isScannedFile("src/signifiers.test.ts")).toBe(false);
    expect(isScannedFile("src/selector-ratchet-allowlist.json")).toBe(false);
    expect(isScannedFile("playwright.config.ts")).toBe(false);
  });
});

describe("compareWithAllowlist", () => {
  const legacy: SelectorViolation = {
    file: "specs/cart/cart.spec.ts",
    rule: "get-by-locator",
    code: 'page.getByRole("main")',
  };

  it("rejects a new violation", () => {
    const added: SelectorViolation = { ...legacy, code: 'page.getByRole("dialog")' };

    const result = compareWithAllowlist([legacy, added], [legacy]);

    expect(result).toEqual({ added: [added], stale: [] });
    expect(formatRatchetResult(result)).toContain("New non-signifier locators");
  });

  it("rejects a repeat of an allowlisted violation", () => {
    expect(compareWithAllowlist([legacy, legacy], [legacy])).toEqual({
      added: [legacy],
      stale: [],
    });
  });

  it("rejects a stale entry after a violation is removed", () => {
    const result = compareWithAllowlist([], [legacy]);

    expect(result).toEqual({ added: [], stale: [legacy] });
    expect(formatRatchetResult(result)).toContain("Stale allowlist entries");
  });

  it("accepts an exact match", () => {
    expect(compareWithAllowlist([legacy], [legacy])).toEqual({ added: [], stale: [] });
  });
});

describe("selector ratchet", () => {
  it("matches the legacy allowlist exactly", () => {
    const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")) as SelectorViolation[];

    const result = compareWithAllowlist(scanPackage(), allowlist);

    expect(formatRatchetResult(result)).toBe("");
  });
});
