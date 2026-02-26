import {setTestStore, test, expect} from '../../fixtures';
import {cart} from '../../fixtures/test-utils';

setTestStore('mockShop');

const PRODUCT_NAME = "Women's T-shirt";
const UNIT_PRICE = '$30.00';
const TWO_ITEMS_PRICE = '$60.00';

test.describe('Cart', () => {
  test.describe('Line Items', () => {
    test.describe('Adding Items', () => {
      test('adds item to cart and opens aside drawer', async ({page}) => {
        await page.goto('/');

        const productLink = page.getByRole('link', {name: PRODUCT_NAME});
        const addToCartButton = page.getByRole('button', {name: 'Add to cart'});
        const cartDialog = page.getByRole('dialog');

        await productLink.click();
        await addToCartButton.click();
        await expect(cartDialog).toBeVisible();

        await cart.assertProductCount(page, 1);
        await cart.assertInCart(page, PRODUCT_NAME);
        await cart.assertSubtotal(page, UNIT_PRICE);
      });

      test('updates cart badge count when adding items', async ({page}) => {
        await page.goto('/');
        await cart.assertTotalItems(page, 0);

        const productLink = page.getByRole('link', {name: PRODUCT_NAME});
        const addToCartButton = page.getByRole('button', {name: 'Add to cart'});

        await productLink.click();
        await addToCartButton.click();
        await cart.closeCartAside(page);

        await cart.assertTotalItems(page, 1);
      });
    });

    test.describe('Quantity Management', () => {
      test.beforeEach(async ({page}) => {
        await page.goto('/');

        const productLink = page.getByRole('link', {name: PRODUCT_NAME});
        const addToCartButton = page.getByRole('button', {name: 'Add to cart'});
        const cartDialog = page.getByRole('dialog');

        await productLink.click();
        await addToCartButton.click();
        await expect(cartDialog).toBeVisible();
        await cart.assertTotalItems(page, 1);
      });

      test('increases quantity in cart aside', async ({page}) => {
        const lineItems = page.getByLabel('Line items').locator('> li:visible');
        const increaseButton = lineItems
          .first()
          .getByRole('button', {name: 'Increase quantity'});

        await increaseButton.click();

        await cart.assertTotalItems(page, 2);
        await cart.assertSubtotal(page, TWO_ITEMS_PRICE);
      });

      test('increases quantity on cart page', async ({page}) => {
        await cart.assertProductCount(page, 1);
        await cart.assertTotalItems(page, 1);

        await cart.closeCartAside(page);
        await cart.navigateToCartPage(page);

        const lineItems = page.getByLabel('Line items').locator('> li:visible');
        const increaseButton = lineItems
          .first()
          .getByRole('button', {name: 'Increase quantity'});

        await increaseButton.click();

        await cart.assertTotalItems(page, 2);
        await cart.assertSubtotal(page, TWO_ITEMS_PRICE);
      });

      test('decreases quantity when above minimum', async ({page}) => {
        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const increaseButton = firstItem.getByRole('button', {
          name: 'Increase quantity',
        });
        const decreaseButton = firstItem.getByRole('button', {
          name: 'Decrease quantity',
        });

        await increaseButton.click();
        await cart.assertTotalItems(page, 2);

        await decreaseButton.click();

        await cart.assertTotalItems(page, 1);
        await cart.assertSubtotal(page, UNIT_PRICE);
      });

      test('disables decrease button at quantity 1', async ({page}) => {
        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const decreaseButton = firstItem.getByRole('button', {
          name: 'Decrease quantity',
        });

        await expect(decreaseButton).toBeDisabled();
      });

      test('updates cart badge when quantity changes', async ({page}) => {
        await cart.assertTotalItems(page, 1);

        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const increaseButton = firstItem.getByRole('button', {
          name: 'Increase quantity',
        });

        await increaseButton.click();
        await cart.closeCartAside(page);

        await cart.assertTotalItems(page, 2);
      });
    });

    test.describe('Removing Items', () => {
      test.beforeEach(async ({page}) => {
        await page.goto('/');
        await page.getByRole('link', {name: PRODUCT_NAME}).click();
        await page.getByRole('button', {name: 'Add to cart'}).click();
      });

      test('removes item from cart aside', async ({page}) => {
        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const removeButton = firstItem.getByRole('button', {name: 'Remove'});
        const emptyCartMessage = page
          .getByRole('dialog')
          .getByText(/Looks like you haven.t added anything yet/);

        await removeButton.click();

        await expect(emptyCartMessage).toBeVisible();
        await cart.assertProductCount(page, 0);
      });

      test('removes item from cart page', async ({page}) => {
        await cart.closeCartAside(page);
        await cart.navigateToCartPage(page);

        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const removeButton = firstItem.getByRole('button', {name: 'Remove'});
        const emptyCartMessage = page
          .locator('main:visible')
          .getByText(/Looks like you haven.t added anything yet/);

        await removeButton.click();

        await cart.assertTotalItems(page, 0);
        await expect(emptyCartMessage).toBeVisible();
      });

      test('updates cart badge to zero after removal', async ({page}) => {
        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const removeButton = firstItem.getByRole('button', {name: 'Remove'});

        await removeButton.click();

        await cart.assertTotalItems(page, 0);
      });
    });

    test.describe('Cart Totals', () => {
      test.beforeEach(async ({page}) => {
        await page.goto('/');

        const productLink = page.getByRole('link', {name: PRODUCT_NAME});
        const addToCartButton = page.getByRole('button', {name: 'Add to cart'});

        await productLink.click();
        await addToCartButton.click();
      });

      test('displays subtotal in cart aside', async ({page}) => {
        await cart.assertSubtotal(page, UNIT_PRICE);
      });

      test('displays subtotal on cart page', async ({page}) => {
        await cart.closeCartAside(page);
        await cart.navigateToCartPage(page);

        await cart.assertSubtotal(page, UNIT_PRICE);
      });

      test('shows checkout button when cart has items', async ({page}) => {
        const checkoutButton = page.getByRole('link', {
          name: /Continue to Checkout/i,
        });

        await expect(checkoutButton).toBeVisible();
      });
    });

    test.describe('Edge Cases', () => {
      test('shows empty cart state on cart page', async ({page}) => {
        await page.goto('/cart');

        const emptyCartMessage = page
          .locator('main:visible')
          .getByText(/Looks like you haven.t added anything yet/);
        const continueShoppingLink = page.getByRole('link', {
          name: /Continue shopping/i,
        });

        await expect(emptyCartMessage).toBeVisible();
        await expect(continueShoppingLink).toBeVisible();
      });

      test('shows empty cart state in cart aside', async ({page}) => {
        await page.goto('/');

        const cartLink = page.getByRole('link', {name: 'Cart'});
        const emptyCartMessage = page
          .getByRole('dialog')
          .getByText(/Looks like you haven.t added anything yet/);

        await cartLink.click();

        await expect(emptyCartMessage).toBeVisible();
      });

      test('persists cart state after navigation', async ({page}) => {
        await page.goto('/');

        const productLink = page.getByRole('link', {name: PRODUCT_NAME});
        const addToCartButton = page.getByRole('button', {name: 'Add to cart'});

        await productLink.click();
        await addToCartButton.click();

        const firstItem = page
          .getByLabel('Line items')
          .locator('> li:visible')
          .first();
        const increaseButton = firstItem.getByRole('button', {
          name: 'Increase quantity',
        });
        const cartLink = page.getByRole('link', {name: 'Cart'});

        await increaseButton.click();
        await cart.assertTotalItems(page, 2);

        await cart.closeCartAside(page);
        await page.goto('/collections');
        await page.goto('/');
        await cartLink.click();

        await cart.assertTotalItems(page, 2);
        await cart.assertSubtotal(page, TWO_ITEMS_PRICE);
      });

      test('cart page displays correct heading', async ({page}) => {
        await page.goto('/cart');

        const cartHeading = page.getByRole('heading', {level: 1, name: 'Cart'});

        await expect(cartHeading).toBeVisible();
      });
    });
  });

  test.describe('Nested Line Items', () => {
    test('Supports nested line items', async ({page, request}) => {
      // Hardcoded variant IDs and expected product names from mockShop
      const PARENT_PRODUCT = {
        title: 'Slides',
        variantId: 'gid://shopify/ProductVariant/43695710371862',
      };
      const CHILD_PRODUCT = {
        title: 'Sweatpants',
        variantId: 'gid://shopify/ProductVariant/43696926949398',
      };

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
            }`,
            variables: {
              lines: [
                {
                  merchandiseId: PARENT_PRODUCT.variantId,
                  quantity: 1,
                },
                {
                  merchandiseId: CHILD_PRODUCT.variantId,
                  quantity: 1,
                  parent: {
                    merchandiseId: PARENT_PRODUCT.variantId,
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
      await cart.setCartId(page, addedLines.data.cartCreate.cart.id);
      await cart.navigateToCartPage(page);

      const lineItems = page.getByLabel('Line items').locator('> li:visible');
      const parentProductLink = lineItems
        .first()
        .getByRole('link', {name: PARENT_PRODUCT.title});
      const nestedList = lineItems.first().getByRole('list', {
        name: `Line items with ${PARENT_PRODUCT.title}`,
      });
      const childProductLink = nestedList.getByRole('link', {
        name: CHILD_PRODUCT.title,
      });

      await expect(parentProductLink).toBeVisible();
      await expect(nestedList).toBeVisible();
      await expect(childProductLink).toBeVisible();
    });
  });
});
