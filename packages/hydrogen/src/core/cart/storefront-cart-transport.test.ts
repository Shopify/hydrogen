import { describe, it, expect, vi } from "vitest";

import type { UpdateCartPayload } from "../../../vendor/standard-actions";
import type { StorefrontClient } from "../../client";
import { gql } from "../../graphql";
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
  describe("getCart", () => {
    it("queries the cart with the custom fragment and returns the cart and headers", async () => {
      const headers = new Headers({ "server-timing": "x" });
      const { graphql, ctx } = createStorefrontClient({ data: { cart: MOCK_CART }, headers });
      const transport = storefrontCartTransport({ fragment: customCartFragment });

      const result = await transport.getCart({ cartId: CART_ID }, ctx);

      expect(graphql).toHaveBeenCalledWith(makeCartQueries({ fragment: customCartFragment }).cart, {
        variables: { id: CART_ID },
      });
      expect(result).toEqual({ cart: MOCK_CART, headers });
      expect(transport.cartQuery).toBe(graphql.mock.calls[0]?.[0]);
    });

    it("returns a null cart with the GraphQL errors instead of throwing", async () => {
      const errors = [{ message: "Throttled" }];
      const { ctx } = createStorefrontClient({ data: null, errors });

      const result = await storefrontCartTransport().getCart({ cartId: CART_ID }, ctx);

      expect(result.cart).toBeNull();
      expect(result.errors).toEqual(errors);
    });
  });

  describe("updateCart", () => {
    const singleMutationCases: Array<{
      name: string;
      payload: UpdateCartPayload;
      query: string;
      key: string;
      variables: Record<string, unknown>;
    }> = [
      {
        name: "new lines",
        payload: { cartId: CART_ID, lines: [{ merchandiseId: "v1", quantity: 1 }] },
        query: cartQueries.cartLinesAdd,
        key: "cartLinesAdd",
        variables: { cartId: CART_ID, lines: [{ merchandiseId: "v1", quantity: 1 }] },
      },
      {
        name: "existing lines",
        payload: { cartId: CART_ID, lines: [{ id: "l1", quantity: 3 }] },
        query: cartQueries.cartLinesUpdate,
        key: "cartLinesUpdate",
        variables: { cartId: CART_ID, lines: [{ id: "l1", quantity: 3 }] },
      },
      {
        name: "existing lines that all have quantity 0",
        payload: {
          cartId: CART_ID,
          lines: [
            { id: "l1", quantity: 0 },
            { id: "l2", quantity: 0 },
          ],
        },
        query: cartQueries.cartLinesRemove,
        key: "cartLinesRemove",
        variables: { cartId: CART_ID, lineIds: ["l1", "l2"] },
      },
      {
        name: "existing lines where only some have quantity 0",
        payload: {
          cartId: CART_ID,
          lines: [
            { id: "l1", quantity: 0 },
            { id: "l2", quantity: 2 },
          ],
        },
        query: cartQueries.cartLinesUpdate,
        key: "cartLinesUpdate",
        variables: {
          cartId: CART_ID,
          lines: [
            { id: "l1", quantity: 0 },
            { id: "l2", quantity: 2 },
          ],
        },
      },
      {
        name: "discount codes",
        payload: { cartId: CART_ID, discountCodes: ["A"] },
        query: cartQueries.cartDiscountCodesUpdate,
        key: "cartDiscountCodesUpdate",
        variables: { cartId: CART_ID, discountCodes: ["A"] },
      },
      {
        name: "an empty note",
        payload: { cartId: CART_ID, note: "" },
        query: cartQueries.cartNoteUpdate,
        key: "cartNoteUpdate",
        variables: { cartId: CART_ID, note: "" },
      },
      {
        name: "attributes",
        payload: { cartId: CART_ID, attributes: [{ key: "k", value: "v" }] },
        query: cartQueries.cartAttributesUpdate,
        key: "cartAttributesUpdate",
        variables: { cartId: CART_ID, attributes: [{ key: "k", value: "v" }] },
      },
    ];

    it.each(singleMutationCases)(
      "runs $key for $name and returns its payload and headers",
      async ({ payload, query, key, variables }) => {
        const headers = new Headers({ "x-request-id": "1" });
        const userErrors = [{ code: null, field: null, message: "Nope" }];
        const warnings = [{ code: "MERCHANDISE_NOT_ENOUGH_STOCK", message: "Low" }];
        const { graphql, ctx } = createStorefrontClient({
          data: { [key]: { cart: MOCK_CART, userErrors, warnings } },
          headers,
        });

        const result = await storefrontCartTransport().updateCart(payload, ctx);

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

      await storefrontCartTransport().updateCart(
        { lines },
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

      await storefrontCartTransport().updateCart({ lines }, ctx);

      expect(graphql).toHaveBeenCalledWith(cartQueries.cartCreate, {
        variables: { input: { lines } },
      });
    });

    it("creates a cart with every field of the payload in one mutation", async () => {
      const { graphql, ctx } = createStorefrontClient({
        data: { cartCreate: mutationPayload() },
      });
      const input = {
        lines: [{ merchandiseId: "v1", quantity: 1 }],
        note: "Gift",
        discountCodes: ["A"],
        attributes: [{ key: "k", value: "v" }],
      };

      await storefrontCartTransport().updateCart(input, ctx);

      expect(graphql).toHaveBeenCalledOnce();
      expect(graphql).toHaveBeenCalledWith(cartQueries.cartCreate, { variables: { input } });
    });

    it("rejects existing lines without a cart ID before calling the API", async () => {
      const { graphql, ctx } = createStorefrontClient();

      await expect(
        storefrontCartTransport().updateCart({ lines: [{ id: "l1", quantity: 1 }] }, ctx),
      ).rejects.toThrow("cartId is required to change existing cart lines");
      expect(graphql).not.toHaveBeenCalled();
    });

    it("ignores the customer access token when the payload targets an existing cart", async () => {
      const { graphql, ctx } = createStorefrontClient({
        data: { cartLinesAdd: mutationPayload() },
      });
      const lines = [{ merchandiseId: "v1", quantity: 1 }];

      await storefrontCartTransport().updateCart(
        { cartId: CART_ID, lines },
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

      await storefrontCartTransport({ fragment: customCartFragment }).updateCart(
        { cartId: CART_ID, note: "Gift" },
        ctx,
      );

      expect(graphql).toHaveBeenCalledWith(queries.cartNoteUpdate, {
        variables: { cartId: CART_ID, note: "Gift" },
      });
    });

    it("returns a null cart when the mutation payload has no cart", async () => {
      const { ctx } = createStorefrontClient({
        data: { cartLinesRemove: { userErrors: [], warnings: [] } },
      });

      const result = await storefrontCartTransport().updateCart(
        { cartId: CART_ID, lines: [{ id: "l1", quantity: 0 }] },
        ctx,
      );

      expect(result.cart).toBeNull();
    });

    it("runs one mutation per field in order and returns the last cart with every warning", async () => {
      const lastCart = { ...MOCK_CART, note: "Gift" };
      const headers = new Headers({ "x-request-id": "2" });
      const { graphql, ctx } = createStorefrontClient(
        {
          data: {
            cartDiscountCodesUpdate: {
              cart: MOCK_CART,
              userErrors: [],
              warnings: [{ code: "A", message: "First" }],
            },
          },
        },
        {
          data: {
            cartNoteUpdate: {
              cart: lastCart,
              userErrors: [],
              warnings: [{ code: "B", message: "Second" }],
            },
          },
          headers,
        },
      );

      const result = await storefrontCartTransport().updateCart(
        { cartId: CART_ID, discountCodes: ["A"], note: "Gift" },
        ctx,
      );

      expect(graphql.mock.calls.map(([query]) => query)).toEqual([
        cartQueries.cartDiscountCodesUpdate,
        cartQueries.cartNoteUpdate,
      ]);
      expect(result).toEqual({
        cart: lastCart,
        userErrors: [],
        warnings: [
          { code: "A", message: "First" },
          { code: "B", message: "Second" },
        ],
        headers,
      });
    });

    it("stops at the first mutation that returns user errors", async () => {
      const userErrors = [{ code: "INVALID", field: null, message: "Bad code" }];
      const { graphql, ctx } = createStorefrontClient({
        data: { cartDiscountCodesUpdate: { cart: MOCK_CART, userErrors, warnings: [] } },
      });

      const result = await storefrontCartTransport().updateCart(
        { cartId: CART_ID, discountCodes: ["A"], note: "Gift" },
        ctx,
      );

      expect(graphql).toHaveBeenCalledOnce();
      expect(result.userErrors).toEqual(userErrors);
    });

    it("rejects a payload with no changes before calling the API", async () => {
      const { graphql, ctx } = createStorefrontClient();

      await expect(storefrontCartTransport().updateCart({ cartId: CART_ID }, ctx)).rejects.toThrow(
        "updateCart payload has no changes",
      );
      expect(graphql).not.toHaveBeenCalled();
    });

    it("rejects a line with neither an id nor a merchandiseId", async () => {
      const { graphql, ctx } = createStorefrontClient();

      await expect(
        storefrontCartTransport().updateCart({ cartId: CART_ID, lines: [{ quantity: 1 }] }, ctx),
      ).rejects.toThrow("Each cart line needs an id or a merchandiseId");
      expect(graphql).not.toHaveBeenCalled();
    });

    it("throws the first GraphQL error", async () => {
      const { ctx } = createStorefrontClient({
        data: null,
        errors: [{ message: "Access denied" }, { message: "Other" }],
      });

      await expect(
        storefrontCartTransport().updateCart({ cartId: CART_ID, note: "x" }, ctx),
      ).rejects.toThrow("Access denied");
    });

    it("throws when the response has no mutation payload", async () => {
      const { ctx } = createStorefrontClient({ data: { cartNoteUpdate: null } });

      await expect(
        storefrontCartTransport().updateCart({ cartId: CART_ID, note: "x" }, ctx),
      ).rejects.toThrow("Missing cartNoteUpdate in mutation response");
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
