import { describe, expect, it } from "vitest";

import { getCollectionViewAttributes, type CollectionViewOptions } from "../collection-view";

const collection = {
  id: "gid://shopify/Collection/1",
  handle: "shirts",
  title: "Shirts",
  products: { nodes: [] },
};

function payload(options: CollectionViewOptions) {
  return JSON.parse(getCollectionViewAttributes(options)["view-event-payload"]);
}

describe("getCollectionViewAttributes", () => {
  it("sends the collection ID, handle, and products count, and drops extra fields", () => {
    expect(payload({ collection, productsCount: 12 })).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 12 },
    });
  });

  it("sends a null ID for a page without a collection record", () => {
    expect(payload({ collection: { id: null, handle: "all" }, productsCount: 3 })).toEqual({
      collection: { id: null, handle: "all", productsCount: 3 },
    });
  });

  it("returns only the trigger and payload attributes", () => {
    expect(getCollectionViewAttributes({ collection, productsCount: 1 })).toEqual({
      "view-event-trigger": "connect",
      "view-event-payload": expect.any(String),
    });
  });
});
