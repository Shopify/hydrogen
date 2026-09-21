import { describe, expect, it } from "vitest";

import { escapeAttribute, hasContent } from "./html";

describe("html helpers", () => {
  it("escapes attribute values including double quotes", () => {
    expect(escapeAttribute('a & b < c > d "e"')).toBe("a &amp; b &lt; c &gt; d &quot;e&quot;");
  });

  it("escapes ampersands in existing entities", () => {
    expect(escapeAttribute("&amp;")).toBe("&amp;amp;");
  });

  it("treats undefined, empty, and whitespace-only strings as lacking content", () => {
    expect(hasContent(undefined)).toBe(false);
    expect(hasContent("")).toBe(false);
    expect(hasContent(" \n\t")).toBe(false);
    expect(hasContent(" x ")).toBe(true);
  });
});
