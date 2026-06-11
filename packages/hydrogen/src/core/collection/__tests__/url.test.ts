import { describe, it, expect } from "vitest";

import type { ProductFilter } from "../../../../vendor/standard-events";
import {
  parseCollectionParams,
  parseSortByValue,
  serializeCollectionParams,
  getFilterRemovalUrl,
  getSortByValue,
  mergeCollectionParams,
  collectionSearchEqual,
  collectionParamsMatchState,
  normalizeCollectionSearch,
  isStoreOwnedParam,
  filterEquals,
  isFilterInputActive,
} from "../url";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parseCollectionParams", () => {
  it("returns defaults for empty params", () => {
    const result = parseCollectionParams(params(""));
    expect(result).toEqual({
      filters: [],
      sortKey: undefined,
      reverse: false,
    });
  });

  describe("filters", () => {
    it("parses tag filter", () => {
      const result = parseCollectionParams(params("filter.p.tag=men"));
      expect(result.filters).toEqual([{ tag: "men" }]);
    });

    it("parses multiple tag filters", () => {
      const result = parseCollectionParams(params("filter.p.tag=men&filter.p.tag=women"));
      expect(result.filters).toEqual([{ tag: "men" }, { tag: "women" }]);
    });

    it("parses availability filter (in stock)", () => {
      const result = parseCollectionParams(params("filter.v.availability=1"));
      expect(result.filters).toEqual([{ available: true }]);
    });

    it("parses availability filter (out of stock)", () => {
      const result = parseCollectionParams(params("filter.v.availability=0"));
      expect(result.filters).toEqual([{ available: false }]);
    });

    it("parses price range filter", () => {
      const result = parseCollectionParams(params("filter.v.price.gte=10&filter.v.price.lte=100"));
      expect(result.filters).toEqual([{ price: { min: 10, max: 100 } }]);
    });

    it("parses price range with only min", () => {
      const result = parseCollectionParams(params("filter.v.price.gte=25"));
      expect(result.filters).toEqual([{ price: { min: 25 } }]);
    });

    it("parses price range with only max", () => {
      const result = parseCollectionParams(params("filter.v.price.lte=50"));
      expect(result.filters).toEqual([{ price: { max: 50 } }]);
    });

    it("parses product type filter", () => {
      const result = parseCollectionParams(params("filter.p.product_type=Sneakers"));
      expect(result.filters).toEqual([{ productType: "Sneakers" }]);
    });

    it("parses vendor filter", () => {
      const result = parseCollectionParams(params("filter.p.vendor=Nike"));
      expect(result.filters).toEqual([{ productVendor: "Nike" }]);
    });

    it("parses variant option filter", () => {
      const result = parseCollectionParams(params("filter.v.option.Color=Red"));
      expect(result.filters).toEqual([{ variantOption: { name: "Color", value: "Red" } }]);
    });

    it("parses lowercase variant option key (mock.shop color facet)", () => {
      const result = parseCollectionParams(params("filter.v.option.color=Beige"));
      expect(result.filters).toEqual([{ variantOption: { name: "color", value: "Beige" } }]);
    });

    it("parses product metafield filter", () => {
      const result = parseCollectionParams(params("filter.p.m.custom.material=leather"));
      expect(result.filters).toEqual([
        {
          productMetafield: {
            namespace: "custom",
            key: "material",
            value: "leather",
          },
        },
      ]);
    });

    it("parses variant metafield filter", () => {
      const result = parseCollectionParams(params("filter.v.m.custom.weight=100g"));
      expect(result.filters).toEqual([
        {
          variantMetafield: {
            namespace: "custom",
            key: "weight",
            value: "100g",
          },
        },
      ]);
    });

    it("parses taxonomy metafield filter", () => {
      const result = parseCollectionParams(params("filter.v.t.color.family=red"));
      expect(result.filters).toEqual([
        { taxonomyMetafield: { key: "color.family", value: "red" } },
      ]);
    });

    it("parses combined filters", () => {
      const result = parseCollectionParams(
        params(
          "filter.v.availability=1&filter.p.tag=men&filter.v.price.gte=20&filter.v.price.lte=200",
        ),
      );
      expect(result.filters).toHaveLength(3);
      expect(result.filters).toContainEqual({ available: true });
      expect(result.filters).toContainEqual({ tag: "men" });
      expect(result.filters).toContainEqual({
        price: { min: 20, max: 200 },
      });
    });
  });

  describe("sort key and reverse", () => {
    it("parses price-ascending", () => {
      const result = parseCollectionParams(params("sort_by=price-ascending"));
      expect(result.sortKey).toBe("PRICE");
      expect(result.reverse).toBe(false);
    });

    it("parses price-descending", () => {
      const result = parseCollectionParams(params("sort_by=price-descending"));
      expect(result.sortKey).toBe("PRICE");
      expect(result.reverse).toBe(true);
    });

    it("parses title-ascending", () => {
      const result = parseCollectionParams(params("sort_by=title-ascending"));
      expect(result.sortKey).toBe("TITLE");
      expect(result.reverse).toBe(false);
    });

    it("parses title-descending", () => {
      const result = parseCollectionParams(params("sort_by=title-descending"));
      expect(result.sortKey).toBe("TITLE");
      expect(result.reverse).toBe(true);
    });

    it("parses created-ascending", () => {
      const result = parseCollectionParams(params("sort_by=created-ascending"));
      expect(result.sortKey).toBe("CREATED");
      expect(result.reverse).toBe(false);
    });

    it("parses created-descending", () => {
      const result = parseCollectionParams(params("sort_by=created-descending"));
      expect(result.sortKey).toBe("CREATED");
      expect(result.reverse).toBe(true);
    });

    it("parses best-selling (no direction)", () => {
      const result = parseCollectionParams(params("sort_by=best-selling"));
      expect(result.sortKey).toBe("BEST_SELLING");
      expect(result.reverse).toBe(false);
    });

    it("parses manual (no direction)", () => {
      const result = parseCollectionParams(params("sort_by=manual"));
      expect(result.sortKey).toBe("MANUAL");
      expect(result.reverse).toBe(false);
    });

    it("returns undefined sortKey when sort_by is missing", () => {
      const result = parseCollectionParams(params("filter.p.tag=men"));
      expect(result.sortKey).toBeUndefined();
      expect(result.reverse).toBe(false);
    });

    it("returns undefined sortKey for unrecognized sort_by value", () => {
      const result = parseCollectionParams(params("sort_by=unknown-value"));
      expect(result.sortKey).toBeUndefined();
      expect(result.reverse).toBe(false);
    });
  });
});

describe("serializeCollectionParams", () => {
  it("returns empty params for default state", () => {
    const result = serializeCollectionParams({
      filters: [],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.toString()).toBe("");
  });

  it("serializes tag filter", () => {
    const result = serializeCollectionParams({
      filters: [{ tag: "men" }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("serializes multiple tag filters", () => {
    const result = serializeCollectionParams({
      filters: [{ tag: "men" }, { tag: "women" }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.getAll("filter.p.tag")).toEqual(["men", "women"]);
  });

  it("serializes availability filter", () => {
    const result = serializeCollectionParams({
      filters: [{ available: true }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.v.availability")).toBe("1");
  });

  it("serializes availability false", () => {
    const result = serializeCollectionParams({
      filters: [{ available: false }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.v.availability")).toBe("0");
  });

  it("serializes price range", () => {
    const result = serializeCollectionParams({
      filters: [{ price: { min: 10, max: 100 } }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.v.price.gte")).toBe("10");
    expect(result.get("filter.v.price.lte")).toBe("100");
  });

  it("serializes sort key with ascending", () => {
    const result = serializeCollectionParams({
      filters: [],
      sortKey: "PRICE",
      reverse: false,
    });
    expect(result.get("sort_by")).toBe("price-ascending");
  });

  it("serializes sort key with descending", () => {
    const result = serializeCollectionParams({
      filters: [],
      sortKey: "PRICE",
      reverse: true,
    });
    expect(result.get("sort_by")).toBe("price-descending");
  });

  it("serializes best-selling (no direction suffix)", () => {
    const result = serializeCollectionParams({
      filters: [],
      sortKey: "BEST_SELLING",
      reverse: false,
    });
    expect(result.get("sort_by")).toBe("best-selling");
  });

  it("serializes manual (no direction suffix)", () => {
    const result = serializeCollectionParams({
      filters: [],
      sortKey: "MANUAL",
      reverse: false,
    });
    expect(result.get("sort_by")).toBe("manual");
  });

  it("serializes variant option filter", () => {
    const result = serializeCollectionParams({
      filters: [{ variantOption: { name: "Color", value: "Red" } }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.v.option.Color")).toBe("Red");
  });

  it("serializes product metafield filter", () => {
    const result = serializeCollectionParams({
      filters: [
        {
          productMetafield: {
            namespace: "custom",
            key: "material",
            value: "leather",
          },
        },
      ],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.p.m.custom.material")).toBe("leather");
  });

  it("serializes variant metafield filter", () => {
    const result = serializeCollectionParams({
      filters: [
        {
          variantMetafield: {
            namespace: "custom",
            key: "weight",
            value: "100g",
          },
        },
      ],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.v.m.custom.weight")).toBe("100g");
  });

  it("serializes taxonomy metafield filter", () => {
    const result = serializeCollectionParams({
      filters: [{ taxonomyMetafield: { key: "color.family", value: "red" } }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.v.t.color.family")).toBe("red");
  });

  it("serializes product type filter", () => {
    const result = serializeCollectionParams({
      filters: [{ productType: "Sneakers" }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.p.product_type")).toBe("Sneakers");
  });

  it("serializes vendor filter", () => {
    const result = serializeCollectionParams({
      filters: [{ productVendor: "Nike" }],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.p.vendor")).toBe("Nike");
  });
});

describe("round-trip: parse → serialize → parse", () => {
  const roundTrip = (query: string) => {
    const first = parseCollectionParams(params(query));
    const serialized = serializeCollectionParams(first);
    return parseCollectionParams(serialized);
  };

  it("round-trips tag filter", () => {
    const query = "filter.p.tag=men&filter.p.tag=women";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.filters).toEqual(first.filters);
  });

  it("round-trips availability filter", () => {
    const first = parseCollectionParams(params("filter.v.availability=1"));
    const second = roundTrip("filter.v.availability=1");
    expect(second.filters).toEqual(first.filters);
  });

  it("round-trips price range", () => {
    const query = "filter.v.price.gte=10&filter.v.price.lte=200";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.filters).toEqual(first.filters);
  });

  it("round-trips sort key with direction", () => {
    const query = "sort_by=price-descending";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.sortKey).toBe(first.sortKey);
    expect(second.reverse).toBe(first.reverse);
  });

  it("round-trips sort key without direction", () => {
    const query = "sort_by=best-selling";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.sortKey).toBe(first.sortKey);
    expect(second.reverse).toBe(first.reverse);
  });

  it("round-trips variant option filter", () => {
    const query = "filter.v.option.Color=Red";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.filters).toEqual(first.filters);
  });

  it("round-trips product metafield filter", () => {
    const query = "filter.p.m.custom.material=leather";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.filters).toEqual(first.filters);
  });

  it("round-trips taxonomy metafield filter", () => {
    const query = "filter.v.t.color.family=red";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.filters).toEqual(first.filters);
  });

  it("round-trips complex combination", () => {
    const query =
      "filter.v.availability=1&filter.p.tag=men&filter.v.price.gte=20&filter.v.price.lte=200&sort_by=title-ascending";
    const first = parseCollectionParams(params(query));
    const second = roundTrip(query);
    expect(second.filters).toEqual(first.filters);
    expect(second.sortKey).toBe(first.sortKey);
    expect(second.reverse).toBe(first.reverse);
  });
});

describe("getFilterRemovalUrl", () => {
  it("removes a single tag filter", () => {
    const current = params("filter.p.tag=men&sort_by=price-ascending");
    const url = getFilterRemovalUrl(current, { tag: "men" });
    expect(url).toBe("?sort_by=price-ascending");
  });

  it("removes one tag from multi-value tag filters", () => {
    const current = params("filter.p.tag=men&filter.p.tag=women");
    const url = getFilterRemovalUrl(current, { tag: "men" });
    const result = new URLSearchParams(url.slice(1));
    expect(result.getAll("filter.p.tag")).toEqual(["women"]);
  });

  it("removes availability filter", () => {
    const current = params("filter.v.availability=1&filter.p.tag=men");
    const url = getFilterRemovalUrl(current, { available: true });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.v.availability")).toBe(false);
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("removes price range filter (min only)", () => {
    const current = params("filter.v.price.gte=10&filter.v.price.lte=100&filter.p.tag=men");
    const url = getFilterRemovalUrl(current, { price: { min: 10 } });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.v.price.gte")).toBe(false);
    expect(result.get("filter.v.price.lte")).toBe("100");
  });

  it("removes entire price range filter", () => {
    const current = params("filter.v.price.gte=10&filter.v.price.lte=100");
    const url = getFilterRemovalUrl(current, {
      price: { min: 10, max: 100 },
    });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.v.price.gte")).toBe(false);
    expect(result.has("filter.v.price.lte")).toBe(false);
  });

  it("removes vendor filter", () => {
    const current = params("filter.p.vendor=Nike&filter.p.vendor=Adidas");
    const url = getFilterRemovalUrl(current, { productVendor: "Nike" });
    const result = new URLSearchParams(url.slice(1));
    expect(result.getAll("filter.p.vendor")).toEqual(["Adidas"]);
  });

  it("removes product type filter", () => {
    const current = params("filter.p.product_type=Sneakers&filter.p.tag=men");
    const url = getFilterRemovalUrl(current, { productType: "Sneakers" });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.p.product_type")).toBe(false);
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("removes variant option filter", () => {
    const current = params("filter.v.option.Color=Red&filter.p.tag=men");
    const url = getFilterRemovalUrl(current, {
      variantOption: { name: "Color", value: "Red" },
    });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.v.option.Color")).toBe(false);
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("removes product metafield filter", () => {
    const current = params("filter.p.m.custom.material=leather&filter.p.tag=men");
    const url = getFilterRemovalUrl(current, {
      productMetafield: {
        namespace: "custom",
        key: "material",
        value: "leather",
      },
    });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.p.m.custom.material")).toBe(false);
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("removes variant metafield filter", () => {
    const current = params("filter.v.m.custom.weight=100g");
    const url = getFilterRemovalUrl(current, {
      variantMetafield: { namespace: "custom", key: "weight", value: "100g" },
    });
    expect(url).toBe("?");
  });

  it("removes taxonomy metafield filter", () => {
    const current = params("filter.v.t.color.family=red&filter.p.tag=men");
    const url = getFilterRemovalUrl(current, {
      taxonomyMetafield: { key: "color.family", value: "red" },
    });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.v.t.color.family")).toBe(false);
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("preserves non-filter params", () => {
    const current = params("filter.p.tag=men&sort_by=price-ascending&view=grid");
    const url = getFilterRemovalUrl(current, { tag: "men" });
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.p.tag")).toBe(false);
    expect(result.get("sort_by")).toBe("price-ascending");
    expect(result.get("view")).toBe("grid");
  });

  it("returns bare ? when all params removed", () => {
    const current = params("filter.p.tag=men");
    const url = getFilterRemovalUrl(current, { tag: "men" });
    expect(url).toBe("?");
  });
});

describe("getSortByValue", () => {
  it("returns price-ascending", () => {
    expect(getSortByValue("PRICE", false)).toBe("price-ascending");
  });

  it("returns price-descending", () => {
    expect(getSortByValue("PRICE", true)).toBe("price-descending");
  });

  it("returns title-ascending", () => {
    expect(getSortByValue("TITLE", false)).toBe("title-ascending");
  });

  it("returns title-descending", () => {
    expect(getSortByValue("TITLE", true)).toBe("title-descending");
  });

  it("returns created-ascending", () => {
    expect(getSortByValue("CREATED", false)).toBe("created-ascending");
  });

  it("returns created-descending", () => {
    expect(getSortByValue("CREATED", true)).toBe("created-descending");
  });

  it("returns best-selling (ignores reverse)", () => {
    expect(getSortByValue("BEST_SELLING", false)).toBe("best-selling");
    expect(getSortByValue("BEST_SELLING", true)).toBe("best-selling");
  });

  it("returns manual (ignores reverse)", () => {
    expect(getSortByValue("MANUAL", false)).toBe("manual");
    expect(getSortByValue("MANUAL", true)).toBe("manual");
  });

  it("returns relevance (ignores reverse)", () => {
    expect(getSortByValue("RELEVANCE", false)).toBe("relevance");
    expect(getSortByValue("RELEVANCE", true)).toBe("relevance");
  });

  it("returns collection-default (ignores reverse)", () => {
    expect(getSortByValue("COLLECTION_DEFAULT", false)).toBe("collection-default");
    expect(getSortByValue("COLLECTION_DEFAULT", true)).toBe("collection-default");
  });

  it("returns id-ascending", () => {
    expect(getSortByValue("ID", false)).toBe("id-ascending");
  });

  it("returns id-descending", () => {
    expect(getSortByValue("ID", true)).toBe("id-descending");
  });
});

describe("parseSortByValue", () => {
  it("parses price-ascending", () => {
    expect(parseSortByValue("price-ascending")).toEqual({
      sortKey: "PRICE",
      reverse: false,
    });
  });

  it("parses price-descending", () => {
    expect(parseSortByValue("price-descending")).toEqual({
      sortKey: "PRICE",
      reverse: true,
    });
  });

  it("parses title-ascending", () => {
    expect(parseSortByValue("title-ascending")).toEqual({
      sortKey: "TITLE",
      reverse: false,
    });
  });

  it("parses title-descending", () => {
    expect(parseSortByValue("title-descending")).toEqual({
      sortKey: "TITLE",
      reverse: true,
    });
  });

  it("parses best-selling (no direction suffix)", () => {
    expect(parseSortByValue("best-selling")).toEqual({
      sortKey: "BEST_SELLING",
      reverse: false,
    });
  });

  it("parses collection-default (no direction suffix)", () => {
    expect(parseSortByValue("collection-default")).toEqual({
      sortKey: "COLLECTION_DEFAULT",
      reverse: false,
    });
  });

  it("parses manual", () => {
    expect(parseSortByValue("manual")).toEqual({
      sortKey: "MANUAL",
      reverse: false,
    });
  });

  it("returns undefined sortKey for unrecognized value", () => {
    expect(parseSortByValue("unknown")).toEqual({
      sortKey: undefined,
      reverse: false,
    });
  });

  it("round-trips with getSortByValue for directional sorts", () => {
    const encoded = getSortByValue("PRICE", true);
    const decoded = parseSortByValue(encoded);
    expect(decoded).toEqual({ sortKey: "PRICE", reverse: true });
  });

  it("round-trips with getSortByValue for non-directional sorts", () => {
    const encoded = getSortByValue("BEST_SELLING", false);
    const decoded = parseSortByValue(encoded);
    expect(decoded).toEqual({ sortKey: "BEST_SELLING", reverse: false });
  });
});

describe("normalizeCollectionSearch", () => {
  it("strips a leading ? from the search string", () => {
    expect(normalizeCollectionSearch("?filter.p.tag=sale")).toBe("filter.p.tag=sale");
  });

  it("returns the string unchanged when there is no leading ?", () => {
    expect(normalizeCollectionSearch("filter.p.tag=sale")).toBe("filter.p.tag=sale");
  });

  it("returns an empty string for an empty input", () => {
    expect(normalizeCollectionSearch("")).toBe("");
  });

  it("returns an empty string for a bare ?", () => {
    expect(normalizeCollectionSearch("?")).toBe("");
  });

  it("preserves ? characters that appear after the first position", () => {
    expect(normalizeCollectionSearch("?filter.p.tag=is%3Ftrue")).toBe("filter.p.tag=is%3Ftrue");
  });
});

describe("collectionSearchEqual", () => {
  it("treats param order as equivalent", () => {
    expect(
      collectionSearchEqual(
        "filter.p.tag=sale&sort_by=price-ascending",
        "sort_by=price-ascending&filter.p.tag=sale",
      ),
    ).toBe(true);
  });
});

describe("mergeCollectionParams", () => {
  it("replaces store-owned keys while preserving others", () => {
    const existing = new URLSearchParams("grid=3&filter.p.tag=men&sort_by=price-ascending");

    const merged = mergeCollectionParams(existing, {
      filters: [{ tag: "women" }],
      sortKey: "TITLE",
      reverse: true,
    });

    expect(merged.get("grid")).toBe("3");
    expect(merged.get("filter.p.tag")).toBe("women");
    expect(merged.get("sort_by")).toBe("title-descending");
    expect(merged.getAll("filter.p.tag")).not.toContain("men");
  });
});

describe("filterEquals", () => {
  it("matches URL-parsed and API-shaped price filters", () => {
    const fromUrl = parseCollectionParams(params("filter.v.price.gte=10&filter.v.price.lte=100"))
      .filters[0];
    const fromApi = { price: { min: 10, max: 100 } };

    expect(filterEquals(fromUrl, fromApi)).toBe(true);
  });

  it("matches URL-parsed and API-shaped partial price filters", () => {
    const fromUrl = parseCollectionParams(params("filter.v.price.lte=50")).filters[0];
    const fromApi = { price: { max: 50 } };

    expect(filterEquals(fromUrl, fromApi)).toBe(true);
  });

  it("does not match different filter kinds", () => {
    expect(filterEquals({ tag: "men" }, { productVendor: "Nike" })).toBe(false);
  });
});

describe("isFilterInputActive", () => {
  it("matches active filters against Storefront API input strings", () => {
    const activeFilters = parseCollectionParams(
      params("filter.p.tag=men&filter.v.option.Color=Red"),
    ).filters;
    const tagInput = JSON.stringify({ tag: "men" });
    const colorInput = JSON.stringify({ variantOption: { name: "Color", value: "Red" } });

    expect(isFilterInputActive(activeFilters, tagInput)).toBe(true);
    expect(isFilterInputActive(activeFilters, colorInput)).toBe(true);
    expect(isFilterInputActive(activeFilters, JSON.stringify({ tag: "women" }))).toBe(false);
  });

  it("returns false for malformed JSON", () => {
    expect(isFilterInputActive([{ tag: "men" }], "not-json")).toBe(false);
  });
});

describe("collectionParamsMatchState", () => {
  it("returns true when URL params match state", () => {
    const state = { filters: [{ tag: "men" }], sortKey: "PRICE" as const, reverse: false };
    const searchParams = params("filter.p.tag=men&sort_by=price-ascending");

    expect(collectionParamsMatchState(searchParams, state)).toBe(true);
  });

  it("returns false when sort keys differ", () => {
    const state = { filters: [], sortKey: "PRICE" as const, reverse: false };
    const searchParams = params("sort_by=title-ascending");

    expect(collectionParamsMatchState(searchParams, state)).toBe(false);
  });

  it("returns false when reverse differs", () => {
    const state = { filters: [], sortKey: "PRICE" as const, reverse: true };
    const searchParams = params("sort_by=price-ascending");

    expect(collectionParamsMatchState(searchParams, state)).toBe(false);
  });

  it("returns false when filters differ", () => {
    const state = { filters: [{ tag: "men" }], sortKey: undefined, reverse: false };
    const searchParams = params("filter.p.tag=women");

    expect(collectionParamsMatchState(searchParams, state)).toBe(false);
  });

  it("matches filters regardless of order", () => {
    const state = {
      filters: [{ tag: "women" }, { tag: "men" }],
      sortKey: undefined,
      reverse: false,
    };
    const searchParams = params("filter.p.tag=men&filter.p.tag=women");

    expect(collectionParamsMatchState(searchParams, state)).toBe(true);
  });

  it("returns true for empty state and empty params", () => {
    const state = { filters: [], sortKey: undefined, reverse: false };
    expect(collectionParamsMatchState(params(""), state)).toBe(true);
  });
});

describe("isStoreOwnedParam", () => {
  it("recognizes sort_by as store-owned", () => {
    expect(isStoreOwnedParam("sort_by")).toBe(true);
  });

  it("recognizes filter.* keys as store-owned", () => {
    expect(isStoreOwnedParam("filter.p.tag")).toBe(true);
    expect(isStoreOwnedParam("filter.v.availability")).toBe(true);
    expect(isStoreOwnedParam("filter.v.price.gte")).toBe(true);
  });

  it("does not consider non-store keys as store-owned", () => {
    expect(isStoreOwnedParam("grid")).toBe(false);
    expect(isStoreOwnedParam("view")).toBe(false);
    expect(isStoreOwnedParam("page")).toBe(false);
  });
});

describe("category filter", () => {
  const categoryFilter: ProductFilter = { category: { id: "gid://shopify/TaxonomyCategory/1" } };

  it("serializes category filter", () => {
    const result = serializeCollectionParams({
      filters: [categoryFilter],
      sortKey: undefined,
      reverse: false,
    });
    expect(result.get("filter.p.category")).toBe("gid://shopify/TaxonomyCategory/1");
  });

  it("removes category filter from URL", () => {
    const current = params(
      "filter.p.category=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2F1&filter.p.tag=men",
    );
    const url = getFilterRemovalUrl(current, categoryFilter);
    const result = new URLSearchParams(url.slice(1));
    expect(result.has("filter.p.category")).toBe(false);
    expect(result.get("filter.p.tag")).toBe("men");
  });

  it("compares category filters by id", () => {
    const a: ProductFilter = { category: { id: "gid://shopify/TaxonomyCategory/1" } };
    const b: ProductFilter = { category: { id: "gid://shopify/TaxonomyCategory/1" } };
    const c: ProductFilter = { category: { id: "gid://shopify/TaxonomyCategory/2" } };

    expect(filterEquals(a, b)).toBe(true);
    expect(filterEquals(a, c)).toBe(false);
  });
});
