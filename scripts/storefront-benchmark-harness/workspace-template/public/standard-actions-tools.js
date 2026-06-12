(function () {
  let e = [
    {
      name: `shopify_get_cart`,
      title: `Get Cart`,
      description: `Fetches the current shopping cart. Returns null if none exists. Accepts an optional cartId to read a specific cart instead of the browser cookie.`,
      inputSchema: {
        type: `object`,
        properties: {
          cartId: {
            type: `string`,
            description: `Cart GID or raw cart token. If omitted, the cart is discovered automatically from the browser cookie.`,
          },
        },
      },
      execute: (e, t) => window.Shopify.actions.getCart(e ?? {}),
      annotations: { readOnlyHint: !0 },
    },
    {
      name: `shopify_update_cart`,
      title: `Update Cart`,
      description: `Updates the shopping cart. Can add items, update quantities, remove items (quantity: 0), set a note, or apply discount codes. Lines without an "id" are treated as new items to add (requires "merchandiseId"). Lines with an "id" update or remove existing items.`,
      inputSchema: {
        type: `object`,
        properties: {
          cartId: {
            type: `string`,
            description: `Cart GID or raw cart token. If omitted, the cart is discovered automatically from the browser cookie.`,
          },
          lines: {
            type: `array`,
            description: `Cart line items to add, update, or remove.`,
            items: {
              type: `object`,
              properties: {
                id: {
                  type: `string`,
                  description: `CartLine GID for an existing item, typically returned by SFAPI. If the cart token suffix is missing, it is appended automatically when the cart id is known. Omit when adding new items.`,
                },
                merchandiseId: {
                  type: `string`,
                  description: `ProductVariant GID or raw variant id. Required when adding new items.`,
                },
                quantity: {
                  type: `integer`,
                  description: `Desired quantity. Set to 0 to remove the item.`,
                },
                attributes: {
                  type: `array`,
                  description: `Custom attributes for the line item.`,
                  items: {
                    type: `object`,
                    properties: { key: { type: `string` }, value: { type: `string` } },
                    required: [`key`, `value`],
                  },
                },
                sellingPlanId: {
                  type: `string`,
                  description: `Selling plan GID or raw selling plan id for subscriptions.`,
                },
              },
              required: [`quantity`],
            },
          },
          note: {
            type: `string`,
            description: `Cart note. Set to an empty string to remove the note.`,
          },
          discountCodes: {
            type: `array`,
            description: `Discount codes to apply to the cart.`,
            items: { type: `string` },
          },
        },
      },
      execute: (e, t) => window.Shopify.actions.updateCart(e ?? {}),
    },
    {
      name: `shopify_open_cart`,
      title: `Open Cart`,
      description: `Opens the shopping cart UI. By default this navigates to the /cart page. Themes may extend this to open a cart drawer or modal instead.`,
      inputSchema: { type: `object`, properties: {} },
      execute: (e, t) => window.Shopify.actions.openCart(),
    },
  ];
  function t(t) {
    if (navigator.modelContext) for (let n of e) navigator.modelContext.registerTool(n, t);
  }
  t();
})();
