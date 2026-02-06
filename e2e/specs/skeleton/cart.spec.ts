import {setTestStore, test, expect} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

test.describe('Cart', () => {
  test.describe('Line Items', () => {
    test.describe('Adding Items', () => {
      test('adds item to cart and opens aside drawer', async ({storefront}) => {
        await storefront.goto('/');
        await storefront.navigateToFirstProduct();
        await storefront.addToCart();

        await expect(storefront.getCartDrawer()).toBeVisible();

        const lineItems = storefront.getCartLineItems();
        await expect(lineItems).toHaveCount(1);

        const firstItem = storefront.getCartLineItemByIndex(0);
        expect(await storefront.getLineItemQuantity(firstItem)).toBe(1);

        await expect(firstItem.locator('strong')).toBeVisible();
      });

      test('updates cart badge count when adding items', async ({
        storefront,
      }) => {
        await storefront.goto('/');
        const initialCount = await storefront.getCartBadgeCount();

        await storefront.navigateToFirstProduct();
        await storefront.addToCart();
        await storefront.closeCartAside();

        const newCount = await storefront.getCartBadgeCount();
        expect(newCount).toBe(initialCount + 1);
      });
    });

    test.describe('Quantity Management', () => {
      test.beforeEach(async ({storefront}) => {
        await storefront.goto('/');
        await storefront.navigateToFirstProduct();
        await storefront.addToCart();
      });

      test('increases quantity in cart aside', async ({storefront}) => {
        const firstItem = storefront.getCartLineItemByIndex(0);
        const initialSubtotal = await storefront.getSubtotalAmount();

        await storefront.increaseLineItemQuantity(firstItem);

        expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);
        // Wait for subtotal to update (network latency)
        await expect
          .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
          .toBeGreaterThan(initialSubtotal);
      });

      test('increases quantity on cart page', async ({storefront}) => {
        await storefront.closeCartAside();
        await storefront.goto('/cart');

        // Ensure cart line items are visible on cart page before proceeding
        await expect(storefront.getCartLineItems().first()).toBeVisible({
          timeout: 10000,
        });

        const firstItem = storefront.getCartLineItemByIndex(0);
        const initialSubtotal = await storefront.getSubtotalAmount();

        await storefront.increaseLineItemQuantity(firstItem);

        expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);
        await expect
          .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
          .toBeGreaterThan(initialSubtotal);
      });

      test('decreases quantity when above minimum', async ({storefront}) => {
        const firstItem = storefront.getCartLineItemByIndex(0);
        const subtotalAtOne = await storefront.getSubtotalAmount();

        await storefront.increaseLineItemQuantity(firstItem);
        expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);

        // Wait for subtotal to increase after adding quantity
        await expect
          .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
          .toBeGreaterThan(subtotalAtOne);
        const subtotalAtTwo = await storefront.getSubtotalAmount();

        await storefront.decreaseLineItemQuantity(firstItem);

        expect(await storefront.getLineItemQuantity(firstItem)).toBe(1);
        await expect
          .poll(() => storefront.getSubtotalAmount(), {timeout: 10000})
          .toBeLessThan(subtotalAtTwo);
      });

      test('disables decrease button at quantity 1', async ({storefront}) => {
        const firstItem = storefront.getCartLineItemByIndex(0);
        const decreaseButton = firstItem.getByRole('button', {
          name: 'Decrease quantity',
        });

        await expect(decreaseButton).toBeDisabled();
      });

      test('updates cart badge when quantity changes', async ({storefront}) => {
        const countAfterAdd = await storefront.getCartBadgeCount();

        const firstItem = storefront.getCartLineItemByIndex(0);
        await storefront.increaseLineItemQuantity(firstItem);
        await storefront.closeCartAside();

        expect(await storefront.getCartBadgeCount()).toBe(countAfterAdd + 1);
      });
    });

    test.describe('Removing Items', () => {
      test.beforeEach(async ({storefront}) => {
        await storefront.goto('/');
        await storefront.navigateToFirstProduct();
        await storefront.addToCart();
      });

      test('removes item from cart aside', async ({storefront}) => {
        const firstItem = storefront.getCartLineItemByIndex(0);

        await storefront.removeLineItem(firstItem);

        await expect(storefront.getCartEmptyMessage()).toBeVisible();
        await expect(storefront.getCartLineItems()).toHaveCount(0);
      });

      test('removes item from cart page', async ({storefront}) => {
        await storefront.closeCartAside();
        await storefront.goto('/cart');

        // Ensure cart line items are visible on cart page before proceeding
        await expect(storefront.getCartLineItems().first()).toBeVisible({
          timeout: 10000,
        });

        const firstItem = storefront.getCartLineItemByIndex(0);
        await storefront.removeLineItem(firstItem);

        await expect(storefront.getCartEmptyMessage()).toBeVisible();
      });

      test('updates cart badge to zero after removal', async ({storefront}) => {
        const firstItem = storefront.getCartLineItemByIndex(0);
        await storefront.removeLineItem(firstItem);

        await expect
          .poll(() => storefront.getCartBadgeCount(), {timeout: 5000})
          .toBe(0);
      });
    });

    test.describe('Cart Totals', () => {
      test.beforeEach(async ({storefront}) => {
        await storefront.goto('/');
        await storefront.navigateToFirstProduct();
        await storefront.addToCart();
      });

      test('displays subtotal in cart aside', async ({storefront}) => {
        const subtotal = await storefront.getSubtotalAmount();
        expect(subtotal).toBeGreaterThan(0);
      });

      test('displays subtotal on cart page', async ({storefront}) => {
        await storefront.closeCartAside();
        await storefront.goto('/cart');

        // Ensure cart line items are visible on cart page before proceeding
        await expect(storefront.getCartLineItems().first()).toBeVisible({
          timeout: 10000,
        });

        const subtotal = await storefront.getSubtotalAmount();
        expect(subtotal).toBeGreaterThan(0);
      });

      test('shows checkout button when cart has items', async ({
        storefront,
      }) => {
        await expect(storefront.getCheckoutButton()).toBeVisible();
      });
    });

    test.describe('Edge Cases', () => {
      test('shows empty cart state on cart page', async ({storefront}) => {
        await storefront.goto('/cart');

        await expect(storefront.getCartEmptyMessage()).toBeVisible();
        await expect(
          storefront.page.getByRole('link', {name: /Continue shopping/i}),
        ).toBeVisible();
      });

      test('shows empty cart state in cart aside', async ({storefront}) => {
        await storefront.goto('/');
        await storefront.openCartAside();

        await expect(storefront.getCartEmptyMessage()).toBeVisible();
      });

      test('persists cart state after navigation', async ({storefront}) => {
        await storefront.goto('/');
        await storefront.navigateToFirstProduct();
        await storefront.addToCart();

        const firstItem = storefront.getCartLineItemByIndex(0);
        await storefront.increaseLineItemQuantity(firstItem);
        // Wait for quantity update to complete before navigation
        expect(await storefront.getLineItemQuantity(firstItem)).toBe(2);

        await storefront.closeCartAside();
        // Navigate to a different page and back
        await storefront.goto('/collections');
        await storefront.goto('/');
        await storefront.openCartAside();

        const item = storefront.getCartLineItemByIndex(0);
        expect(await storefront.getLineItemQuantity(item)).toBe(2);
      });

      test('cart page displays correct heading', async ({storefront}) => {
        await storefront.goto('/cart');

        const heading = storefront.page.getByRole('heading', {
          level: 1,
          name: 'Cart',
        });
        await expect(heading).toBeVisible();
      });
    });
  });

  test.describe('Nested Line Items', () => {
    test('Supports nested line items', async ({page, storefront, request}) => {
      const cartId = await storefront.getCartId();
      expect(cartId).not.toBeDefined();

      const products = await request
        .post('api/2025-10/graphql.json', {
          data: {
            query: `query productsWithVariants {
          products(first:2){
            nodes {
              title
              variants(first: 10){
                nodes {
                  title
                  id
                }
              }
            }
          }
        }`,
          },
        })
        .then((response) => response.json());

      const firstProduct = products.data.products.nodes[0]
        ? {
            title: products.data.products.nodes[0].title,
            firstVariant: products.data.products.nodes[0].variants.nodes[0],
          }
        : undefined;
      const secondProduct = products.data.products.nodes[1]
        ? {
            title: products.data.products.nodes[1].title,
            firstVariant: products.data.products.nodes[1].variants.nodes[0],
          }
        : undefined;

      expect(firstProduct).toBeDefined();
      expect(secondProduct).toBeDefined();

      const addedLines = await request
        .post('api/2025-10/graphql.json', {
          data: {
            query: `mutation createCartWithNested($lines: [CartLineInput!]!) {
            cartCreate(input: {lines: $lines}) {
              userErrors {
                code
                message
              }
              warnings {code, message}
              cart {
                id
                lines(first: 10) {
                  nodes {
                    id
                    ...on CartLine {
                      parentRelationship {
                        parent {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
`,
            variables: {
              lines: [
                {
                  merchandiseId: firstProduct?.firstVariant.id,
                  quantity: 1,
                },
                {
                  merchandiseId: secondProduct?.firstVariant.id,
                  quantity: 1,
                  parent: {
                    merchandiseId: firstProduct?.firstVariant.id,
                  },
                },
              ],
            },
          },
        })
        .then((response) => response.json());

      expect(addedLines.data.cartCreate.cart.id).toBeDefined();
      expect(addedLines.data.cartCreate.userErrors).toHaveLength(0);
      expect(addedLines.data.cartCreate.cart.lines.nodes).toHaveLength(2);
      expect(
        addedLines.data.cartCreate.cart.lines.nodes[0].parentRelationship,
      ).toBeNull();
      expect(
        addedLines.data.cartCreate.cart.lines.nodes[1].parentRelationship,
      ).not.toBeNull();

      await page.goto('/');
      await storefront.setCartId(addedLines.data.cartCreate.cart.id);

      await page.goto('/cart');

      const lineItems = await page
        .getByRole('list', {name: 'Line items'})
        .getByRole('listitem')
        .all();

      /** verify if the first product is there */
      const firstProductLocator = lineItems[0].getByRole('link', {
        name: firstProduct?.title,
      });
      await expect(firstProductLocator).toBeVisible();

      const nestedLineItems = lineItems[0].getByRole('list', {
        name: `Line items with ${firstProduct?.title}`,
      });
      await expect(nestedLineItems).toBeVisible();

      const nestedProductLocator = nestedLineItems.getByRole('link', {
        name: secondProduct?.title,
      });
      await expect(nestedProductLocator).toBeVisible();
    });
  });
});
