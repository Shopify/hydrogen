import { describe, it, expect, vi } from "vitest";

import type { StorefrontClient } from "../../client";
import { gql } from "../../graphql";
import type { CartAction } from "./actions";
import { cartBuyerIdentityUpdateMutation, cartQueries, makeCartQueries } from "./queries";
import { storefrontCartTransport } from "./storefront-cart-transport";

const CART_ID = "gid://shopify/Cart/123";
const MOCK_CART = { id: CART_ID, discountCodes: [{ code: "SAVE10", applicable: true }] };

const customCartFragment = gql(`
  fragment CartFragment on Cart {
    attributes {
      key
      value
    }
  }
`);

type GraphQLResponse = {
  data: unknown;
  errors?: Array<{ message: string }>;
  headers?: Headers;
};

function createStorefrontClient(...responses: GraphQLResponse[]) {
  const graphql = vi.fn();
  for (const { headers = new Headers(), ...response } of responses) {
    graphql.mockResolvedValueOnce({ ...response, headers });
  }
  const storefrontClient = { graphql } as unknown as StorefrontClient;
  return { graphql, ctx: { storefrontClient } };
}

function mutationPayload(cart: unknown = MOCK_CART) {
  return { cart, userErrors: [], warnings: [] };
}

describe("storefrontCartTransport", () => {
  describe("read", () => {
    it("queries the cart with the custom fragment and returns the cart and headers", async () => {
      const headers = new Headers({ "server-timing": "x" });
      const { graphql, ctx } = createStorefrontClient({ data: { cart: MOCK_CART }, headers });
      const transport = storefrontCartTransport({ fragment: customCartFragment });

      const result = await transport.read(CART_ID, ctx);

      expect(graphql).toHaveBeenCalledWith(makeCartQueries({ fragment: customCartFragment }).cart, {
        variables: { id: CART_ID },
      });
      expect(result).toEqual({ cart: MOCK_CART, headers });
      expect(transport.cartQuery).toBe(graphql.mock.calls[0]?.[0]);
    });

    it("returns a null cart with the GraphQL errors instead of throwing", async () => {
      const errors = [{ message: "Throttled" }];
      const { ctx } = createStorefrontClient({ data: null, errors });

      const result = await storefrontCartTransport().read(CART_ID, ctx);

      expect(result.cart).toBeNull();
      expect(result.errors).toEqual(errors);
    });
  });

  describe("apply", () => {
    const singleMutationCases: Array<{
      action: CartAction;
      query: string;
      key: string;
      variables: Record<string, unknown>;
    }> = [
      {
        action: { intent: "add", lines: [{ merchandiseId: "v1", quantity: 1 }] },
        query: cartQueries.cartLinesAdd,
        key: "cartLinesAdd",
        variables: { cartId: CART_ID, lines: [{ merchandiseId: "v1", quantity: 1 }] },
      },
      {
        action: { intent: "update", lines: [{ id: "l1", quantity: 3 }] },
        query: cartQueries.cartLinesUpdate,
        key: "cartLinesUpdate",
        variables: { cartId: CART_ID, lines: [{ id: "l1", quantity: 3 }] },
      },
      {
        action: { intent: "remove", lineIds: ["l1"] },
        query: cartQueries.cartLinesRemove,
        key: "cartLinesRemove",
        variables: { cartId: CART_ID, lineIds: ["l1"] },
      },
      {
        action: { intent: "discount-update", discountCodes: ["A"] },
        query: cartQueries.cartDiscountCodesUpdate,
        key: "cartDiscountCodesUpdate",
        variables: { cartId: CART_ID, discountCodes: ["A"] },
      },
      {
        action: { intent: "note-update", note: "Gift" },
        query: cartQueries.cartNoteUpdate,
        key: "cartNoteUpdate",
        variables: { cartId: CART_ID, note: "Gift" },
      },
      {
        action: { intent: "attributes-update", attributes: [{ key: "k", value: "v" }] },
        query: cartQueries.cartAttributesUpdate,
        key: "cartAttributesUpdate",
        variables: { cartId: CART_ID, attributes: [{ key: "k", value: "v" }] },
      },
    ];

    it.each(singleMutationCases)(
      "runs $key for $action.intent and returns its payload and headers",
      async ({ action, query, key, variables }) => {
        const headers = new Headers({ "x-request-id": "1" });
        const userErrors = [{ code: null, field: null, message: "Nope" }];
        const warnings = [{ code: "MERCHANDISE_NOT_ENOUGH_STOCK", message: "Low" }];
        const { graphql, ctx } = createStorefrontClient({
          data: { [key]: { cart: MOCK_CART, userErrors, warnings } },
          headers,
        });

        const result = await storefrontCartTransport().apply(CART_ID, action, ctx);

        expect(graphql).toHaveBeenCalledOnce();
        expect(graphql).toHaveBeenCalledWith(query, { variables });
        expect(result).toEqual({ cart: MOCK_CART, userErrors, warnings, headers });
      },
    );

    it("creates a cart with the customer access token when there is no cart ID", async () => {
      const { graphql, ctx } = createStorefrontClient({
        data: { cartCreate: mutationPayload() },
      });
      const lines = [{ merchandiseId: "v1", quantity: 1 }];

      await storefrontCartTransport().apply(
        null,
        { intent: "add", lines },
        { ...ctx, customerAccessToken: "token" },
      );

      expect(graphql).toHaveBeenCalledWith(cartQueries.cartCreate, {
        variables: { input: { lines, buyerIdentity: { customerAccessToken: "token" } } },
      });
    });

    it("creates an anonymous cart without a buyer identity", async () => {
      const { graphql, ctx } = createStorefrontClient({
        data: { cartCreate: mutationPayload() },
      });
      const lines = [{ merchandiseId: "v1", quantity: 1 }];

      await storefrontCartTransport().apply(null, { intent: "add", lines }, ctx);

      expect(graphql).toHaveBeenCalledWith(cartQueries.cartCreate, {
        variables: { input: { lines } },
      });
    });

    it("ignores the customer access token when an add targets an existing cart", async () => {
      const { graphql, ctx } = createStorefrontClient({
        data: { cartLinesAdd: mutationPayload() },
      });
      const lines = [{ merchandiseId: "v1", quantity: 1 }];

      await storefrontCartTransport().apply(
        CART_ID,
        { intent: "add", lines },
        { ...ctx, customerAccessToken: "token" },
      );

      expect(graphql).toHaveBeenCalledWith(cartQueries.cartLinesAdd, {
        variables: { cartId: CART_ID, lines },
      });
    });

    it("runs mutations with the custom fragment's documents", async () => {
      const queries = makeCartQueries({ fragment: customCartFragment });
      const { graphql, ctx } = createStorefrontClient({
        data: { cartNoteUpdate: mutationPayload() },
      });

      await storefrontCartTransport({ fragment: customCartFragment }).apply(
        CART_ID,
        { intent: "note-update", note: "Gift" },
        ctx,
      );

      expect(graphql).toHaveBeenCalledWith(queries.cartNoteUpdate, {
        variables: { cartId: CART_ID, note: "Gift" },
      });
    });

    it("returns a null cart when the payload has no cart", async () => {
      const { ctx } = createStorefrontClient({
        data: { cartLinesRemove: { userErrors: [], warnings: [] } },
      });

      const result = await storefrontCartTransport().apply(
        CART_ID,
        { intent: "remove", lineIds: ["l1"] },
        ctx,
      );

      expect(result.cart).toBeNull();
    });

    it.each([
      { mode: "discount-apply", code: "NEW", expected: ["SAVE10", "NEW"] },
      { mode: "discount-remove", code: "SAVE10", expected: [] },
    ] as const)(
      "$mode reads the current codes, then writes the new list",
      async ({ mode, code, expected }) => {
        const { graphql, ctx } = createStorefrontClient(
          { data: { cart: MOCK_CART } },
          { data: { cartDiscountCodesUpdate: mutationPayload() } },
        );

        await storefrontCartTransport().apply(CART_ID, { intent: mode, code }, ctx);

        expect(graphql).toHaveBeenNthCalledWith(1, cartQueries.cart, {
          variables: { id: CART_ID },
        });
        expect(graphql).toHaveBeenNthCalledWith(2, cartQueries.cartDiscountCodesUpdate, {
          variables: { cartId: CART_ID, discountCodes: expected },
        });
      },
    );

    it("rejects a non-add action without a cart ID before calling the API", async () => {
      const { graphql, ctx } = createStorefrontClient();

      await expect(
        storefrontCartTransport().apply(null, { intent: "note-update", note: "x" }, ctx),
      ).rejects.toThrow("cartId is required for non-add mutations");
      expect(graphql).not.toHaveBeenCalled();
    });

    it("throws the first GraphQL error", async () => {
      const { ctx } = createStorefrontClient({
        data: null,
        errors: [{ message: "Access denied" }, { message: "Other" }],
      });

      await expect(
        storefrontCartTransport().apply(CART_ID, { intent: "remove", lineIds: ["l1"] }, ctx),
      ).rejects.toThrow("Access denied");
    });

    it("throws when the response has no mutation payload", async () => {
      const { ctx } = createStorefrontClient({ data: { cartLinesRemove: null } });

      await expect(
        storefrontCartTransport().apply(CART_ID, { intent: "remove", lineIds: ["l1"] }, ctx),
      ).rejects.toThrow("Missing cartLinesRemove in mutation response");
    });
  });

  describe("updateBuyerIdentity", () => {
    it("detaches the customer when the token is null", async () => {
      const { graphql, ctx } = createStorefrontClient({
        data: { cartBuyerIdentityUpdate: { cart: { id: CART_ID }, userErrors: [] } },
      });

      await storefrontCartTransport().updateBuyerIdentity(CART_ID, null, ctx);

      expect(graphql).toHaveBeenCalledWith(cartBuyerIdentityUpdateMutation, {
        variables: { cartId: CART_ID, buyerIdentity: { customerAccessToken: null } },
      });
    });

    it("throws the user errors joined by newlines", async () => {
      const { ctx } = createStorefrontClient({
        data: {
          cartBuyerIdentityUpdate: {
            cart: null,
            userErrors: [{ message: "First" }, { message: "Second" }],
          },
        },
      });

      await expect(
        storefrontCartTransport().updateBuyerIdentity(CART_ID, "token", ctx),
      ).rejects.toThrow("First\nSecond");
    });
  });

  it("throws at creation for a fragment that isn't CartFragment", () => {
    const fragment = gql(`
      fragment Other on Cart {
        id
      }
    `);

    expect(() => storefrontCartTransport({ fragment })).toThrow();
  });
});
