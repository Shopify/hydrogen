import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { getSameOriginPath } from "./url";

const ORIGIN = "https://shop.example";

const urlSafeText = (maxLength: number) =>
  fc.stringMatching(new RegExp(`^[A-Za-z0-9_~-]{1,${maxLength}}$`));

/** A link to a page of the site, written the way the URL standard already normalizes it. */
const sitePath = fc
  .record({
    segments: fc.array(urlSafeText(8), { minLength: 1, maxLength: 4 }),
    query: fc.option(urlSafeText(12)),
    hash: fc.option(urlSafeText(12)),
  })
  .map(({ segments, query, hash }) => {
    const search = query === null ? "" : `?q=${query}`;
    return `/${segments.join("/")}${search}${hash === null ? "" : `#${hash}`}`;
  });

/** Origins that differ from the site's by scheme, port, or a look-alike host. */
const lookalikeOrigin = fc.constantFrom(
  "http://shop.example",
  "https://shop.example:8443",
  "https://shop.example.evil.example",
  "https://evil.example",
);

/** Starts on the site, then tries to slip a second host past the parser. */
const hostSmuggling = fc
  .tuple(
    fc.constantFrom("", ORIGIN, "//shop.example", "/x/..", "/.", "/x/../.."),
    fc.array(fc.constantFrom("/", "\\", "\t", "\n"), { minLength: 1, maxLength: 4 }),
    fc.constantFrom("evil.example", "evil.example/p?q#h", "@evil.example", "evil.example:443"),
  )
  .map(([start, slashes, host]) => `${start}${slashes.join("")}${host}`);

const urlPieces = fc.constantFrom(
  ORIGIN,
  "https://evil.example",
  "shop.example",
  "evil.example",
  "https:",
  "http:",
  "javascript:",
  "//",
  "/",
  "\\",
  "/..",
  "@",
  ":",
  "?",
  "#",
  "%2f",
  "%5c",
);

/** Redirect targets as an attacker writes them, next to ordinary URLs and arbitrary text. */
const redirectTarget = fc.oneof(
  hostSmuggling,
  fc.tuple(lookalikeOrigin, sitePath).map(([origin, path]) => `${origin}${path}`),
  fc
    .array(fc.oneof(urlPieces, fc.string({ maxLength: 3 })), { maxLength: 8 })
    .map((pieces) => pieces.join("")),
  fc.webUrl({ withQueryParameters: true, withFragments: true }),
  fc.string({ unit: "binary" }),
);

describe("getSameOriginPath", () => {
  it("only returns a location on the origin, and only for a target on the origin", () => {
    fc.assert(
      fc.property(redirectTarget, (target) => {
        const location = getSameOriginPath(target, ORIGIN);
        if (location === undefined) return;

        // A browser resolves a link, and a redirect's Location header, against the site.
        expect(new URL(target, ORIGIN).origin).toBe(ORIGIN);
        expect(new URL(location, ORIGIN).origin).toBe(ORIGIN);
      }),
    );
  });

  it("keeps a link to a page of the site, as a path or as a full URL", () => {
    fc.assert(
      fc.property(sitePath, (path) => {
        expect(getSameOriginPath(path, ORIGIN)).toBe(path);
        expect(getSameOriginPath(`${ORIGIN}${path}`, ORIGIN)).toBe(path);
      }),
    );
  });
});
