import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/routes/home.tsx", import.meta.url), "utf8");

test("home products request the newest-created products first", () => {
  // CREATED_AT orders by product creation date (not publication date); reverse
  // puts the newest first. The route keeps the API order without re-sorting.
  assert.match(source, /\n\s+products\(first: 8, sortKey: CREATED_AT, reverse: true\) \{/);
  assert.doesNotMatch(source, /BEST_SELLING/);
  assert.doesNotMatch(source, /\.sort\(/);
});

test("home product section and metadata are labelled as new arrivals", () => {
  assert.match(source, /<h2 id="new-arrivals-heading"[^>]*>\s*New arrivals\s*<\/h2>/);
  assert.match(source, /aria-labelledby="new-arrivals-heading"/);
  assert.match(source, /content: `Shop new arrivals and featured categories at \$\{shopName\}\.`/);
  assert.doesNotMatch(source, /best.sellers?|BestSellers/i);
});

test("the hero keeps its most recently updated collection query", () => {
  assert.match(
    source,
    /heroCollections: collections\(first: 1, sortKey: UPDATED_AT, reverse: true\)/,
  );
});
