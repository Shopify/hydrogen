import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { redirectIfHandleIsLocalized } from "./redirect.ts";

describe("redirectIfHandleIsLocalized", () => {
  it("redirects to the canonical typed route when handles repeat", () => {
    const response = redirectIfHandleIsLocalized(
      new Request("https://shop.example/fr-ca/blogs/news/news?view=latest"),
      "/fr-ca/blogs/journal/actualites",
      { handle: "news", data: { handle: "journal" } },
      { handle: "news", data: { handle: "actualites" } },
    );

    assert.ok(response);
    assert.equal(response.headers.get("Location"), "/fr-ca/blogs/journal/actualites?view=latest");
  });

  it("preserves encoded route segments and the query string", () => {
    const response = redirectIfHandleIsLocalized(
      new Request("https://shop.example/products/red%20dress?variant=1"),
      "/products/robe%20rouge",
      { handle: "red dress", data: { handle: "robe rouge" } },
    );

    assert.ok(response);
    assert.equal(response.headers.get("Location"), "/products/robe%20rouge?variant=1");
  });

  it("does not redirect when every handle is already canonical", () => {
    const response = redirectIfHandleIsLocalized(
      new Request("https://shop.example/products/robe"),
      "/products/robe",
      { handle: "robe", data: { handle: "robe" } },
    );

    assert.equal(response, null);
  });
});
