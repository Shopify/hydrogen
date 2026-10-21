import { setTimeout as sleep } from "node:timers/promises";

import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { createStorefrontCache } from "./storefront.ts";

describe("createStorefrontCache", () => {
  // lru-cache measures TTLs with `performance.now()`, so this waits on the real clock.
  it("stores objects and expires them after Hydrogen's TTL in seconds", async () => {
    const cache = createStorefrontCache();
    cache.set("shop", { name: "Hydrogen" }, { ttl: 1 });

    await sleep(500);
    assert.deepEqual(cache.get("shop"), { name: "Hydrogen" });

    await sleep(700);
    assert.equal(cache.get("shop"), undefined);
  });

  it("ignores values that aren't objects and deletes entries", () => {
    const cache = createStorefrontCache();
    cache.set("text", "not an object");
    assert.equal(cache.get("text"), undefined);

    cache.set("shop", { name: "Hydrogen" });
    cache.delete("shop");
    assert.equal(cache.get("shop"), undefined);
  });
});
