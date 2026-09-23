import assert from "node:assert/strict";
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

const brandCover = { url: "https://example.com/brand-cover.jpg", altText: "North Coast studio" };

test("brand cover image outranks collection and product images with shop-level copy", () => {
  assert.deepEqual(selectHomeHero([collection], "North Coast", brandCover), {
    heading: "North Coast",
    description: null,
    image: brandCover,
    to: "/collections",
  });
  assert.deepEqual(
    selectHomeHero([{ ...collection, image: null }], "North Coast", brandCover).image,
    brandCover,
  );
});

test("brand cover image works when no collection exists", () => {
  assert.deepEqual(selectHomeHero([], "North Coast", { ...brandCover, altText: null }), {
    heading: "North Coast",
    description: null,
    image: { url: brandCover.url, altText: null },
    to: "/collections",
  });
});

test("ignores an absent, null, or blank brand cover and keeps collection selection", () => {
  const expected = selectHomeHero([collection], "Shop");
  assert.deepEqual(selectHomeHero([collection], "Shop", null), expected);
  assert.deepEqual(selectHomeHero([collection], "Shop", undefined), expected);
  assert.deepEqual(
    selectHomeHero([collection], "Shop", { url: "   ", altText: "Blank" }),
    expected,
  );
  assert.equal(selectHomeHero([{ ...collection, image: null }], "Shop", null).image, productImage);
  assert.deepEqual(selectHomeHero([], "North Coast", { url: "", altText: null }), {
    heading: "North Coast",
    description: null,
    image: null,
    to: "/collections",
  });
});

test("preserves merchant copy without inventing marketing claims or parsing HTML", () => {
  const description = "Small batches & natural fibres.\nCare: <gentle wash>.";
  const hero = selectHomeHero([{ ...collection, description }], "Shop");
  assert.equal(hero.heading, collection.title);
  assert.equal(hero.description, description);
});
