import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { selectHomeHero } from "../app/lib/home-hero.ts";

const collectionImage = { url: "https://example.com/collection.jpg", altText: "Linen clothing" };
const productImage = { url: "https://example.com/linen-shirt.jpg", altText: "Linen shirt" };
const collection = {
  title: "Linen & cotton",
  handle: "linen-cotton",
  description: "  Clothing made from linen and cotton.  ",
  image: collectionImage,
  products: { nodes: [{ featuredImage: productImage }] },
};

test("uses only the first collection's title, plain description, image, and real destination", () => {
  assert.deepEqual(
    selectHomeHero([collection, { ...collection, title: "Another collection" }], "Shop"),
    {
      heading: "Linen & cotton",
      description: "Clothing made from linen and cotton.",
      image: collectionImage,
      to: "/collections/linen-cotton",
    },
  );
});

test("falls back to the selected collection's first product image", () => {
  assert.equal(selectHomeHero([{ ...collection, image: null }], "Shop").image, productImage);
});

test("does not borrow an image or copy from another collection or a later product", () => {
  const first = {
    ...collection,
    description: " ",
    image: null,
    products: { nodes: [{ featuredImage: null }, { featuredImage: productImage }] },
  };
  assert.deepEqual(selectHomeHero([first, collection], "Shop"), {
    heading: collection.title,
    description: null,
    image: null,
    to: "/collections/linen-cotton",
  });
});

test("handles a collection without products and omits an empty description", () => {
  const hero = selectHomeHero(
    [{ ...collection, description: "", image: null, products: { nodes: [] } }],
    "Shop",
  );
  assert.equal(hero.image, null);
  assert.equal(hero.description, null);
  assert.equal(hero.to, "/collections/linen-cotton");
});

test("uses the supplied root shop name and collection index when no collection exists", () => {
  assert.deepEqual(selectHomeHero([], "North Coast"), {
    heading: "North Coast",
    description: null,
    image: null,
    to: "/collections",
  });
});

test("home query requests the most recently updated collection for the hero", async () => {
  const source = await readFile(new URL("../app/routes/home.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /heroCollections: collections\(first: 1, sortKey: UPDATED_AT, reverse: true\)/,
  );
  assert.match(source, /selectHomeHero\(\s*loaderData\.heroCollections,/);
  assert.doesNotMatch(source, /coverImage/);

  const rootSource = await readFile(new URL("../app/root.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(rootSource, /coverImage/);
});

test("preserves merchant copy without inventing marketing claims or parsing HTML", () => {
  const description = "Small batches & natural fibres.\nCare: <gentle wash>.";
  const hero = selectHomeHero([{ ...collection, description }], "Shop");
  assert.equal(hero.heading, collection.title);
  assert.equal(hero.description, description);
});
