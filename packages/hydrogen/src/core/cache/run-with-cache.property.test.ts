import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { Cache, createRunWithCache } from "./index";
import type { CacheKey, CacheKeyPrimitive } from "./key";

/** Any character a JavaScript string can hold, including half of a surrogate pair on its own. */
const character = fc.oneof(
  fc.string({ unit: "binary", minLength: 1, maxLength: 1 }),
  fc.integer({ min: 0xd800, max: 0xdfff }).map((codeUnit) => String.fromCharCode(codeUnit)),
);
const text = fc.string({ unit: character, maxLength: 6 });
const keyParts = fc.array(
  fc.oneof<fc.Arbitrary<CacheKeyPrimitive>[]>(text, fc.double(), fc.boolean(), fc.constant(null)),
  { maxLength: 4 },
);
const cacheKey = fc.oneof<fc.Arbitrary<CacheKey>[]>(text, keyParts);

const changeOneCharacter = fc
  .tuple(
    text.filter((key) => key.length > 0),
    fc.nat(),
    character,
  )
  .map(([key, position, replacement]): [CacheKey, CacheKey] => {
    const index = position % key.length;
    return [key, key.slice(0, index) + replacement + key.slice(index + 1)];
  });

/** Different keys that read alike once written out: the pairs a careless key format confuses. */
const lookalikeKeys = fc.oneof<fc.Arbitrary<[CacheKey, CacheKey]>[]>(
  keyParts.map((parts) => [parts, parts.map(String)]),
  keyParts.map((parts) => [parts, [parts.join(",")]]),
  keyParts.map((parts) => [parts, JSON.stringify(parts)]),
  text.map((key) => [key, [key]]),
  changeOneCharacter,
);

const keyPair = fc.oneof(
  { weight: 3, arbitrary: lookalikeKeys },
  fc.tuple(cacheKey, cacheKey),
  cacheKey.map((key): [CacheKey, CacheKey] => [key, structuredClone(key)]),
);

const samePart = (left: CacheKeyPrimitive, right: CacheKeyPrimitive) =>
  left === right || (Number.isNaN(left) && Number.isNaN(right));

function sameKey(left: CacheKey, right: CacheKey): boolean {
  if (typeof left === "string" || typeof right === "string") return left === right;
  return left.length === right.length && left.every((part, index) => samePart(part, right[index]));
}

describe("createRunWithCache", () => {
  it("serves cached data to the key that stored it, and to no other key", async () => {
    await fc.assert(
      fc.asyncProperty(keyPair, async ([storedKey, requestedKey]) => {
        const entries = new Map<string, unknown>();
        const runWithCache = createRunWithCache({
          cache: {
            get: (key) => entries.get(key),
            set: (key, value) => entries.set(key, value),
          },
        });
        const strategy = Cache.long();

        await runWithCache({ key: storedKey, strategy }, () => ({
          data: { owner: "stored key" },
          shouldCache: true,
        }));
        const { data } = await runWithCache({ key: requestedKey, strategy }, () => ({
          data: { owner: "requested key" },
          shouldCache: true,
        }));

        expect(data.owner).toBe(sameKey(storedKey, requestedKey) ? "stored key" : "requested key");
      }),
      // A collision needs two particular keys to meet, and a run costs microseconds.
      { numRuns: 1_000 },
    );
  });
});
