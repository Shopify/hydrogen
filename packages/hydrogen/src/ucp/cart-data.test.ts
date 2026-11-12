import { describe, expect, it } from "vitest";

import {
  hasCapability,
  indexCatalog,
  isUcpCart,
  minorToDecimal,
  toCartData,
  toUserErrors,
  toWarnings,
  type UcpCart,
  type UcpCatalog,
} from "./cart-data";
import fixtures from "./test-fixtures.json" with { type: "json" };

const getCart = fixtures.getCart.result.structuredContent as UcpCart;
const catalog = fixtures.lookupCatalog.result.structuredContent as UcpCatalog;
const VARIANT_1 = "gid://shopify/ProductVariant/51604076232760";

describe("minorToDecimal", () => {
  it.each([
    [14400, "CAD", "144.00"],
    [5, "USD", "0.05"],
    [0, "USD", "0.00"],
    [-1250, "EUR", "-12.50"],
    [500, "JPY", "500"],
    [1234, "KWD", "1.234"],
  ])("formats %d %s as %s", (amount, currency, expected) => {
    expect(minorToDecimal(amount, currency)).toBe(expected);
  });
});

describe("hasCapability", () => {
  it("reads negotiated capabilities from ucp.capabilities", () => {
    const minimal = fixtures.updateCartMinimalProfileDiscount.result.structuredContent as UcpCart;

    expect(hasCapability(getCart, "dev.ucp.shopping.discount")).toBe(true);
    expect(hasCapability(minimal, "dev.ucp.shopping.discount")).toBe(false);
    expect(hasCapability({}, "dev.ucp.shopping.cart")).toBe(false);
  });
});

describe("toCartData", () => {
  it("maps a UCP cart with catalog details to cart data", () => {
    const cart = toCartData(getCart, indexCatalog(catalog));

    expect(cart).toMatchObject({
      id: getCart.id,
      checkoutUrl: getCart.continue_url,
      totalQuantity: 3,
      cost: {
        subtotalAmount: { amount: "432.00", currencyCode: "CAD" },
        totalAmount: { amount: "432.00", currencyCode: "CAD" },
        checkoutChargeAmount: { amount: "432.00", currencyCode: "CAD" },
      },
      note: null,
      attributes: [],
      discountCodes: [
        { code: "NOTACODE", applicable: false },
        { code: "free-ship", applicable: true },
      ],
    });
    const line = cart.lines.nodes.find(({ merchandise }) => merchandise?.id === VARIANT_1);
    expect(line).toEqual({
      id: "gid://shopify/CartLine/0676ac35-238a-4032-9ce4-9687f0b142c2?cart=fixture-cart-token",
      quantity: 1,
      attributes: [],
      sellingPlanAllocation: null,
      cost: {
        amountPerQuantity: { amount: "144.00", currencyCode: "CAD" },
        subtotalAmount: { amount: "144.00", currencyCode: "CAD" },
        totalAmount: { amount: "144.00", currencyCode: "CAD" },
        compareAtAmountPerQuantity: null,
      },
      merchandise: {
        id: VARIANT_1,
        title: "Default Title",
        selectedOptions: [{ name: "Color", value: "White" }],
        product: {
          id: "gid://shopify/Product/10589303308344",
          title: "Example product",
          handle: "home-decor-example-product-1",
        },
        image: {
          url: "https://cdn.shopify.com/s/files/1/0879/7759/0840/files/home-decor-products-1.jpg?v=1769464767",
        },
      },
    });
  });

  it("falls back to the line item title without catalog details", () => {
    const cart = toCartData(getCart, indexCatalog(null));

    const line = cart.lines.nodes.find(({ merchandise }) => merchandise?.id === VARIANT_1);
    expect(line?.merchandise).toMatchObject({
      title: "Default Title",
      selectedOptions: [],
      product: { title: "Default Title" },
    });
    expect(line?.merchandise?.product).not.toHaveProperty("handle");
  });

  it("formats zero-decimal currencies", () => {
    const cart = toCartData({ ...getCart, currency: "JPY" }, new Map());

    expect(cart.cost.totalAmount).toEqual({ amount: "43200", currencyCode: "JPY" });
  });

  it("returns no discount codes when the cart has no discounts", () => {
    const minimal = fixtures.updateCartMinimalProfileDiscount.result.structuredContent as UcpCart;

    expect(toCartData(minimal, new Map()).discountCodes).toEqual([]);
  });

  it("accepts automatic discounts, which have a title but no code", () => {
    const automatic = {
      ...getCart,
      discounts: {
        codes: ["free-ship"],
        applied: [
          { code: "free-ship", title: "Free shipping" },
          { title: "2nd item at 15% Off", amount: 3285, automatic: true },
        ],
      },
    };

    expect(isUcpCart(automatic)).toBe(true);
    expect(toCartData(automatic, new Map()).discountCodes).toEqual([
      { code: "free-ship", applicable: true },
    ]);
  });
});

describe("UCP messages", () => {
  it("maps errors to user errors with matching Storefront codes and no field", () => {
    const { messages } = fixtures.updateCartBadVariant.result.structuredContent as UcpCart;

    expect(toUserErrors(messages)).toEqual([
      {
        code: "INVALID",
        message: "The merchandise with id gid://shopify/ProductVariant/1 does not exist.",
      },
    ]);
    expect(toWarnings(messages)).toEqual([]);
  });

  it("uses a null code for errors without a matching Storefront code", () => {
    expect(
      toUserErrors([{ type: "error", code: "item_unavailable", content: "Unavailable" }]),
    ).toEqual([{ code: null, message: "Unavailable" }]);
  });

  it("maps discount_code_invalid to a DISCOUNT_NOT_FOUND warning", () => {
    const { messages } = fixtures.updateCartDiscount.result.structuredContent as UcpCart;

    expect(toWarnings(messages)).toEqual([
      { code: "DISCOUNT_NOT_FOUND", message: "Enter a valid discount code" },
    ]);
    expect(toUserErrors(messages)).toEqual([]);
  });

  it("leaves out warnings without a matching Storefront code", () => {
    expect(toWarnings([{ type: "warning", code: "something_new", content: "New" }])).toEqual([]);
  });
});
