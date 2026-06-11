// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AnalyticsEvent } from "../events";
import type { ShopAnalytics } from "../types";
import { createShopifyAnalyticsProcessor } from "./shopify-analytics";
import { sendShopifyAnalytics, MonorailEventName } from "./utils/monorail";

vi.mock("./utils/monorail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils/monorail")>();
  return {
    ...actual,
    sendShopifyAnalytics: vi.fn(),
  };
});

vi.mock("./utils/browser-params", () => ({
  getClientBrowserParameters: vi.fn(() => ({
    uniqueToken: "unique-token",
    visitToken: "visit-token",
    url: "http://localhost/",
    path: "/",
    search: "",
    referrer: "",
    title: "Test",
    userAgent: "vitest",
    navigationType: "navigate",
    navigationApi: "PerformanceNavigationTiming",
  })),
}));

const sendAnalyticsMock = vi.mocked(sendShopifyAnalytics);

const SHOP: ShopAnalytics = {
  shopId: "gid://shopify/Shop/1",
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: "0",
};

const PRODUCT = {
  id: "gid://shopify/Product/1",
  variantId: "gid://shopify/ProductVariant/1",
  title: "Test Product",
  variantTitle: "Default",
  vendor: "TestVendor",
  price: "10.00",
  quantity: 1,
  productType: "Snowboard",
};

const CART_LINE = {
  id: "gid://shopify/CartLine/1",
  quantity: 1,
  merchandise: {
    id: "gid://shopify/ProductVariant/1",
    title: "Default",
    price: { amount: "10.00" },
    sku: "SKU-1",
    product: {
      id: "gid://shopify/Product/1",
      title: "Test Product",
      vendor: "TestVendor",
      productType: "Snowboard",
    },
  },
};

function mockCustomerPrivacy(overrides?: {
  analyticsProcessingAllowed?: boolean;
  marketingAllowed?: boolean;
  saleOfDataAllowed?: boolean;
}) {
  (window as any).Shopify = {
    customerPrivacy: {
      analyticsProcessingAllowed: () => overrides?.analyticsProcessingAllowed ?? true,
      marketingAllowed: () => overrides?.marketingAllowed ?? true,
      saleOfDataAllowed: () => overrides?.saleOfDataAllowed ?? true,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCustomerPrivacy();
});

afterEach(() => {
  delete (window as any).Shopify;
});

// ---------------------------------------------------------------------------
// Consent / customer privacy guards
// ---------------------------------------------------------------------------

describe("consent guards", () => {
  it("does not send when customerPrivacy is absent", () => {
    delete (window as any).Shopify;
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, { shop: SHOP, url: "/" });
    expect(sendAnalyticsMock).not.toHaveBeenCalled();
  });

  it("includes consent flags in Monorail payload", () => {
    mockCustomerPrivacy({
      analyticsProcessingAllowed: true,
      marketingAllowed: false,
      saleOfDataAllowed: true,
    });
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, { shop: SHOP, url: "/" });
    const payload = sendAnalyticsMock.mock.calls[0][0].payload;

    expect(payload.analyticsAllowed).toBe(true);
    expect(payload.marketingAllowed).toBe(false);
    expect(payload.saleOfDataAllowed).toBe(true);
    expect(payload.gdprEnforced).toBe(true);
    expect(payload.ccpaEnforced).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Missing shop config validation
// ---------------------------------------------------------------------------

describe("missing shop config", () => {
  it.each(["shopId", "acceptedLanguage", "currency", "hydrogenSubchannelId"])(
    "logs error and skips send when shop.%s is missing",
    (field) => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const processor = createShopifyAnalyticsProcessor();
      const incompleteShop = { ...SHOP, [field]: "" };

      processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, {
        shop: incompleteShop,
        url: "/",
      });

      expect(sendAnalyticsMock).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(field));
      errorSpy.mockRestore();
    },
  );
});

// ---------------------------------------------------------------------------
// Product validation error messages
// ---------------------------------------------------------------------------

describe("validateProducts error messages", () => {
  it("logs error when products array is empty", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [],
      url: "/products/test",
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("data.products"));
    errorSpy.mockRestore();
  });

  it("logs error for missing product field with specific field name", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [{ id: "gid://shopify/Product/1" }],
      url: "/products/test",
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("title"));
    errorSpy.mockRestore();
  });

  it("logs error for missing cart line field with merchandise path", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
      shop: SHOP,
      cart: { id: "gid://shopify/Cart/1" },
      currentLine: {
        ...CART_LINE,
        merchandise: {
          ...CART_LINE.merchandise,
          product: { ...CART_LINE.merchandise.product, vendor: "" },
        },
      },
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("vendor"));
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Event routing — each handler sends to the correct Monorail event
// ---------------------------------------------------------------------------

describe("event routing", () => {
  it("PAGE_VIEWED sends PAGE_VIEW_2", () => {
    const processor = createShopifyAnalyticsProcessor();
    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, { shop: SHOP, url: "/" });

    expect(sendAnalyticsMock).toHaveBeenCalledOnce();
    expect(sendAnalyticsMock.mock.calls[0][0].eventName).toBe(MonorailEventName.PAGE_VIEW_2);
  });

  it("PRODUCT_VIEWED sends PRODUCT_VIEW with formatted products", () => {
    const processor = createShopifyAnalyticsProcessor();
    processor.handleEvent(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: "/products/test",
    });

    expect(sendAnalyticsMock).toHaveBeenCalledOnce();
    const call = sendAnalyticsMock.mock.calls[0][0];
    expect(call.eventName).toBe(MonorailEventName.PRODUCT_VIEW);
    expect(call.payload.products).toEqual([
      expect.objectContaining({
        productGid: PRODUCT.id,
        variantGid: PRODUCT.variantId,
        name: PRODUCT.title,
        variantName: PRODUCT.variantTitle,
        brand: PRODUCT.vendor,
        price: PRODUCT.price,
      }),
    ]);
  });

  it("COLLECTION_VIEWED sends COLLECTION_VIEW with collection data", () => {
    const processor = createShopifyAnalyticsProcessor();
    processor.handleEvent(AnalyticsEvent.COLLECTION_VIEWED, {
      shop: SHOP,
      collection: { id: "gid://shopify/Collection/1", handle: "winter" },
      url: "/collections/winter",
    });

    expect(sendAnalyticsMock).toHaveBeenCalledOnce();
    const call = sendAnalyticsMock.mock.calls[0][0];
    expect(call.eventName).toBe(MonorailEventName.COLLECTION_VIEW);
    expect(call.payload.collectionHandle).toBe("winter");
    expect(call.payload.collectionId).toBe("gid://shopify/Collection/1");
  });

  it("SEARCH_VIEWED sends SEARCH_VIEW with search term", () => {
    const processor = createShopifyAnalyticsProcessor();
    processor.handleEvent(AnalyticsEvent.SEARCH_VIEWED, {
      shop: SHOP,
      searchTerm: "snowboard",
      url: "/search?q=snowboard",
    });

    expect(sendAnalyticsMock).toHaveBeenCalledOnce();
    const call = sendAnalyticsMock.mock.calls[0][0];
    expect(call.eventName).toBe(MonorailEventName.SEARCH_VIEW);
    expect(call.payload.searchString).toBe("snowboard");
  });

  it("PRODUCT_ADD_TO_CART sends ADD_TO_CART with cart and product data", () => {
    const processor = createShopifyAnalyticsProcessor();
    processor.handleEvent(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
      shop: SHOP,
      cart: { id: "gid://shopify/Cart/1" },
      currentLine: CART_LINE,
    });

    expect(sendAnalyticsMock).toHaveBeenCalledOnce();
    const call = sendAnalyticsMock.mock.calls[0][0];
    expect(call.eventName).toBe(MonorailEventName.ADD_TO_CART);

    const payload = call.payload as unknown as Record<string, unknown>;
    expect(payload.cartId).toBe("gid://shopify/Cart/1");
    expect(payload.products).toHaveLength(1);
    expect((payload.products as any[])[0]).toEqual(
      expect.objectContaining({
        productGid: CART_LINE.merchandise.product.id,
        variantGid: CART_LINE.merchandise.id,
        sku: CART_LINE.merchandise.sku,
      }),
    );
  });

  it("ignores unknown event names silently", () => {
    const processor = createShopifyAnalyticsProcessor();
    processor.handleEvent("unknown_event", { shop: SHOP });

    expect(sendAnalyticsMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// viewPayload accumulation — product/collection/search set page-type context
// that PAGE_VIEWED merges into its Monorail send
// ---------------------------------------------------------------------------

describe("viewPayload accumulation", () => {
  it("PAGE_VIEWED merges page-type context from a prior PRODUCT_VIEWED", () => {
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: "/products/test",
    });
    sendAnalyticsMock.mockClear();

    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: "/products/test",
    });

    expect(sendAnalyticsMock).toHaveBeenCalledOnce();
    const payload = sendAnalyticsMock.mock.calls[0][0].payload;
    expect(payload.pageType).toBe("product");
    expect(payload.resourceId).toBe("gid://shopify/Product/1");
  });

  it("viewPayload resets after PAGE_VIEWED fires", () => {
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: "/products/test",
    });
    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: "/products/test",
    });
    sendAnalyticsMock.mockClear();

    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, { shop: SHOP, url: "/" });

    const payload = sendAnalyticsMock.mock.calls[0][0].payload;
    expect(payload).not.toHaveProperty("pageType");
    expect(payload).not.toHaveProperty("resourceId");
  });

  it("viewPayload is isolated between processor instances", () => {
    const processorA = createShopifyAnalyticsProcessor();
    const processorB = createShopifyAnalyticsProcessor();

    processorA.handleEvent(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: "/products/test",
    });
    sendAnalyticsMock.mockClear();

    processorB.handleEvent(AnalyticsEvent.PAGE_VIEWED, { shop: SHOP, url: "/" });

    const payload = sendAnalyticsMock.mock.calls[0][0].payload;
    expect(payload).not.toHaveProperty("pageType");
    expect(payload).not.toHaveProperty("resourceId");
  });

  it("COLLECTION_VIEWED sets collection page-type context for PAGE_VIEWED", () => {
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.COLLECTION_VIEWED, {
      shop: SHOP,
      collection: { id: "gid://shopify/Collection/1", handle: "winter" },
      url: "/collections/winter",
    });
    sendAnalyticsMock.mockClear();

    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: "/collections/winter",
    });

    const payload = sendAnalyticsMock.mock.calls[0][0].payload;
    expect(payload.pageType).toBe("collection");
    expect(payload.resourceId).toBe("gid://shopify/Collection/1");
  });

  it("SEARCH_VIEWED sets search page-type context for PAGE_VIEWED", () => {
    const processor = createShopifyAnalyticsProcessor();

    processor.handleEvent(AnalyticsEvent.SEARCH_VIEWED, {
      shop: SHOP,
      searchTerm: "boards",
      url: "/search?q=boards",
    });
    sendAnalyticsMock.mockClear();

    processor.handleEvent(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: "/search?q=boards",
    });

    const payload = sendAnalyticsMock.mock.calls[0][0].payload;
    expect(payload.pageType).toBe("search");
  });
});
