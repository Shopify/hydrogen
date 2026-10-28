import { describe, expect, it } from "vitest";

import { matchLanguage } from "./language";

describe("matchLanguage", () => {
  it("prefers the regional variant when the shop publishes it", () => {
    expect(matchLanguage("pt-BR", ["EN", "PT_BR", "PT_PT"])).toBe("PT_BR");
  });

  it("falls back to the base language", () => {
    expect(matchLanguage("fr-CA", ["EN", "FR"])).toBe("FR");
    expect(matchLanguage("en", ["EN"])).toBe("EN");
  });

  it("returns undefined for languages the shop doesn't publish", () => {
    expect(matchLanguage("de", ["EN", "FR"])).toBeUndefined();
  });
});
