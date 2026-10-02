import { describe, expect, it } from "vitest";

import {
  createBreadcrumbJsonLd,
  createOrganizationJsonLd,
  createProductJsonLd,
  serializeJsonLd,
} from "./json-ld";

const URL = "https://example.com/products/snowboard";

const variant = {
  id: "gid://shopify/ProductVariant/1",
  sku: "SNOW-1",
  availableForSale: true,
  price: { amount: "129.00", currencyCode: "USD" },
  image: { url: "https://cdn.shopify.com/variant.jpg" },
};

const product = {
  id: "gid://shopify/Product/1",
  title: "Snowboard",
  description: "A board for snow.",
  vendor: "Hydrogen",
  productType: "Boards",
  images: ["https://cdn.shopify.com/a.jpg", { url: "https://cdn.shopify.com/variant.jpg" }],
  priceRange: {
    minVariantPrice: { amount: "99.00", currencyCode: "USD" },
    maxVariantPrice: { amount: "149.00", currencyCode: "USD" },
  },
};

describe("serializeJsonLd", () => {
  it("escapes characters that could end the script element", () => {
    const html = serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "Product",
      description: "</script><img src=x onerror=alert(1)> & more",
    });

    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
    expect(html).not.toContain("&");
    expect(JSON.parse(html)).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      description: "</script><img src=x onerror=alert(1)> & more",
    });
  });

  it("escapes JavaScript line separators", () => {
    const html = serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "Thing",
      name: "line\u2028break\u2029here",
    });

    expect(html).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(html).name).toBe("line\u2028break\u2029here");
  });

  it("serializes an array of nodes", () => {
    const html = serializeJsonLd([
      { "@context": "https://schema.org", "@type": "Organization", name: "A" },
      { "@context": "https://schema.org", "@type": "WebSite", name: "B" },
    ]);

    expect(JSON.parse(html)).toHaveLength(2);
  });
});

describe("createProductJsonLd", () => {
  it("builds a Product with a single Offer for the selected variant", () => {
    const jsonLd = createProductJsonLd(product, { url: URL, selectedVariant: variant });

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": URL,
      url: URL,
      name: "Snowboard",
      description: "A board for snow.",
      productID: "gid://shopify/Product/1",
      sku: "SNOW-1",
      category: "Boards",
      brand: { "@type": "Brand", name: "Hydrogen" },
      offers: {
        "@type": "Offer",
        url: URL,
        price: "129.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        sku: "SNOW-1",
      },
    });
  });

  it("moves the selected variant image to the front", () => {
    const jsonLd = createProductJsonLd(product, { url: URL, selectedVariant: variant });

    expect(jsonLd.image).toEqual([
      "https://cdn.shopify.com/variant.jpg",
      "https://cdn.shopify.com/a.jpg",
    ]);
  });

  it("adds a selected variant image that is not in the product images", () => {
    const jsonLd = createProductJsonLd(
      { ...product, images: ["https://cdn.shopify.com/a.jpg"] },
      { url: URL, selectedVariant: variant },
    );

    expect(jsonLd.image).toEqual([
      "https://cdn.shopify.com/variant.jpg",
      "https://cdn.shopify.com/a.jpg",
    ]);
  });

  it("marks unavailable variants OutOfStock", () => {
    const jsonLd = createProductJsonLd(product, {
      url: URL,
      selectedVariant: { ...variant, availableForSale: false },
    });

    expect(jsonLd.offers).toMatchObject({ availability: "https://schema.org/OutOfStock" });
  });

  it("builds one Offer per variant with per-variant URLs", () => {
    const second = { ...variant, id: "gid://shopify/ProductVariant/2", sku: "SNOW-2" };
    const jsonLd = createProductJsonLd(product, {
      url: URL,
      selectedVariant: variant,
      variants: [variant, second],
      getVariantUrl: (v) => `${URL}?variant=${v.id?.split("/").pop()}`,
    });

    expect(jsonLd.sku).toBeUndefined();
    expect(jsonLd.offers).toEqual([
      expect.objectContaining({ sku: "SNOW-1", url: `${URL}?variant=1` }),
      expect.objectContaining({ sku: "SNOW-2", url: `${URL}?variant=2` }),
    ]);
  });

  it("falls back to an AggregateOffer from the price range", () => {
    const jsonLd = createProductJsonLd(product, { url: URL });

    expect(jsonLd.sku).toBeUndefined();
    expect(jsonLd.offers).toEqual({
      "@type": "AggregateOffer",
      url: URL,
      priceCurrency: "USD",
      lowPrice: "99.00",
      highPrice: "149.00",
    });
  });

  it("uses the minimum price as the high price when the maximum is not queried", () => {
    const jsonLd = createProductJsonLd(
      { ...product, priceRange: { minVariantPrice: product.priceRange.minVariantPrice } },
      { url: URL },
    );

    expect(jsonLd.offers).toMatchObject({ lowPrice: "99.00", highPrice: "99.00" });
  });

  it("omits fields that were not queried", () => {
    const jsonLd = createProductJsonLd({ title: "Bare" }, { url: URL });

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": URL,
      url: URL,
      name: "Bare",
    });
    expect(JSON.parse(serializeJsonLd(jsonLd))).not.toHaveProperty("offers");
  });
});

describe("createBreadcrumbJsonLd", () => {
  it("numbers positions from one and leaves the current page without an item", () => {
    const jsonLd = createBreadcrumbJsonLd([
      { name: "Home", url: "https://example.com/" },
      { name: "Collections", url: "https://example.com/collections" },
      { name: "Winter" },
    ]);

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://example.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Collections",
          item: "https://example.com/collections",
        },
        { "@type": "ListItem", position: 3, name: "Winter", item: undefined },
      ],
    });
  });
});

describe("createOrganizationJsonLd", () => {
  it("builds an Organization node", () => {
    expect(
      createOrganizationJsonLd({
        name: "Hydrogen Store",
        url: "https://example.com",
        logo: "https://cdn.shopify.com/logo.png",
        sameAs: ["https://instagram.com/hydrogen"],
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Hydrogen Store",
      url: "https://example.com",
      logo: "https://cdn.shopify.com/logo.png",
      description: undefined,
      sameAs: ["https://instagram.com/hydrogen"],
    });
  });

  it("omits an empty sameAs list", () => {
    expect(
      createOrganizationJsonLd({ name: "A", url: "https://example.com", sameAs: [] }).sameAs,
    ).toBeUndefined();
  });
});
