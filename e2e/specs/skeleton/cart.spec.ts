import {setTestStore, test, expect} from '../../fixtures';
import {CartUtil} from '../../fixtures/cart-utils';

setTestStore('hydrogenPreviewStorefront');

const PRODUCT_NAME = 'The Element';
const PRODUCT_HANDLE = 'the-element';
const UNIT_PRICE = '$749.95';
const TWO_ITEMS_PRICE = '$1,499.90';

test.describe('Cart', () => {
  test.describe('Line Items', () => {
    test.describe('Adding Items', () => {
      test('adds item to cart and opens aside drawer', async ({page}) => {
        const cart = new CartUtil(page);
        await page.goto(`/products/${PRODUCT_HANDLE}`);

        await cart.addItem(PRODUCT_NAME);

        await cart.assertProductCount(1);
        await cart.assertInCart(PRODUCT_NAME);
        await cart.assertSubtotal(UNIT_PRICE);
      });

      test('updates cart badge count when adding items', async ({page}) => {
        const cart = new CartUtil(page);
        await page.goto(`/products/${PRODUCT_HANDLE}`);
        await cart.assertTotalItems(0);

        await cart.addItem(PRODUCT_NAME);
        await cart.closeCartAside();

        await cart.assertTotalItems(1);
      });
    });

    test.describe('Quantity Management', () => {
      test.beforeEach(async ({page}) => {
        const cart = new CartUtil(page);
        await page.goto(`/products/${PRODUCT_HANDLE}`);

        await cart.addItem(PRODUCT_NAME);
        await cart.assertTotalItems(1);
      });

      test('increases quantity in cart aside', async ({page}) => {
        const cart = new CartUtil(page);
        const increaseButton = cart.getIncreaseButton(
          cart.getLineItems().first(),
        );

        await increaseButton.click();

        await cart.assertTotalItems(2);
        await cart.assertSubtotal(TWO_ITEMS_PRICE);
      });

      test('increases quantity on cart page', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.assertProductCount(1);
        await cart.assertTotalItems(1);

        await cart.closeCartAside();
        await cart.navigateToCartPage();

        const increaseButton = cart.getIncreaseButton(
          cart.getLineItems().first(),
        );

        await increaseButton.click();

        await cart.assertTotalItems(2);
        await cart.assertSubtotal(TWO_ITEMS_PRICE);
      });

      test('decreases quantity when above minimum', async ({page}) => {
        const cart = new CartUtil(page);
        const firstItem = cart.getLineItems().first();
        const increaseButton = cart.getIncreaseButton(firstItem);
        const decreaseButton = cart.getDecreaseButton(firstItem);

        await increaseButton.click();
        await cart.assertTotalItems(2);

        await decreaseButton.click();

        await cart.assertTotalItems(1);
        await cart.assertSubtotal(UNIT_PRICE);
      });

      test('disables decrease button at quantity 1', async ({page}) => {
        const cart = new CartUtil(page);
        const decreaseButton = cart.getDecreaseButton(
          cart.getLineItems().first(),
        );

        await expect(decreaseButton).toBeDisabled();
      });

      test('updates cart badge when quantity changes', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.assertTotalItems(1);

        const increaseButton = cart.getIncreaseButton(
          cart.getLineItems().first(),
        );

        await increaseButton.click();
        await cart.closeCartAside();

        await cart.assertTotalItems(2);
      });
    });

    test.describe('Removing Items', () => {
      test.beforeEach(async ({page}) => {
        const cart = new CartUtil(page);
        await page.goto(`/products/${PRODUCT_HANDLE}`);
        await cart.addItem(PRODUCT_NAME);
      });

      test('removes item from cart aside', async ({page}) => {
        const cart = new CartUtil(page);
        const removeButton = cart.getRemoveButton(cart.getLineItems().first());
        const emptyCartMessage = page
          .getByRole('dialog', {name: 'Cart'})
          .getByText(/Looks like you haven.t added anything yet/);

        await removeButton.click();

        await expect(emptyCartMessage).toBeVisible();
        await cart.assertProductCount(0);
      });

      test('removes item from cart page', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.closeCartAside();
        await cart.navigateToCartPage();

        const removeButton = cart.getRemoveButton(cart.getLineItems().first());
        const emptyCartMessage = page
          .getByLabel('Cart page')
          .getByText(/Looks like you haven.t added anything yet/);

        await removeButton.click();

        await cart.assertTotalItems(0);
        await expect(emptyCartMessage).toBeVisible();
      });

      test('updates cart badge to zero after removal', async ({page}) => {
        const cart = new CartUtil(page);
        const removeButton = cart.getRemoveButton(cart.getLineItems().first());

        await removeButton.click();

        await cart.assertTotalItems(0);
      });
    });

    test.describe('Cart Totals', () => {
      test.beforeEach(async ({page}) => {
        const cart = new CartUtil(page);
        await page.goto(`/products/${PRODUCT_HANDLE}`);

        await cart.addItem(PRODUCT_NAME);
      });

      test('displays subtotal in cart aside', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.assertSubtotal(UNIT_PRICE);
      });

      test('displays subtotal on cart page', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.closeCartAside();
        await cart.navigateToCartPage();

        await cart.assertSubtotal(UNIT_PRICE);
      });

      test('shows checkout button when cart has items', async ({page}) => {
        const checkoutButton = page.getByRole('link', {
          name: 'Continue to Checkout →',
        });

        await expect(checkoutButton).toBeVisible();
      });
    });

    test.describe('Edge Cases', () => {
      test('shows empty cart state on cart page', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.navigateToCartPage();

        const emptyCartMessage = page
          .getByLabel('Cart page')
          .getByText(/Looks like you haven.t added anything yet/);
        const continueShoppingLink = page.getByRole('link', {
          name: 'Continue shopping',
        });

        await expect(emptyCartMessage).toBeVisible();
        await expect(continueShoppingLink).toBeVisible();
      });

      test('shows empty cart state in cart aside', async ({page}) => {
        await page.goto('/');

        const cartLink = page.getByRole('link', {name: 'Cart'});
        const emptyCartMessage = page
          .getByRole('dialog', {name: 'Cart'})
          .getByText(/Looks like you haven.t added anything yet/);

        await cartLink.click();

        await expect(emptyCartMessage).toBeVisible();
      });

      test('persists cart state after navigation', async ({page}) => {
        const cart = new CartUtil(page);
        await page.goto(`/products/${PRODUCT_HANDLE}`);
        await cart.addItem(PRODUCT_NAME);

        const increaseButton = cart.getIncreaseButton(
          cart.getLineItems().first(),
        );
        const cartLink = page.getByRole('link', {name: 'Cart'});

        await increaseButton.click();
        await cart.assertTotalItems(2);

        await cart.closeCartAside();
        await page.goto('/collections');
        await page.goto('/');
        await cartLink.click();

        await cart.assertTotalItems(2);
        await cart.assertSubtotal(TWO_ITEMS_PRICE);
      });

      test('cart page displays correct heading', async ({page}) => {
        const cart = new CartUtil(page);
        await cart.navigateToCartPage();

        const cartHeading = page.getByRole('heading', {level: 1, name: 'Cart'});

        await expect(cartHeading).toBeVisible();
      });
    });
  });

  test.describe('Nested Line Items', () => {
    test('Supports nested line items', async ({page, request}) => {
      const cart = new CartUtil(page);
      const PARENT_PRODUCT = {
        title: 'The Element',
        variantId: 'gid://shopify/ProductVariant/43567673344056',
      };
      const CHILD_PRODUCT = {
        title: 'The Elemental',
        variantId: 'gid://shopify/ProductVariant/43567673442360',
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
      await cart.setCartId(addedLines.data.cartCreate.cart.id);
      await cart.navigateToCartPage();

      const lineItems = cart.getLineItems();
      const parentProductLink = lineItems
        .first()
        .getByRole('link', {name: PARENT_PRODUCT.title, exact: true});
      const nestedList = lineItems.first().getByRole('list', {
        name: `Line items with ${PARENT_PRODUCT.title}`,
      });
      const childProductLink = nestedList.getByRole('link', {
        name: CHILD_PRODUCT.title,
        exact: true,
      });

      await expect(parentProductLink).toBeVisible();
      await expect(nestedList).toBeVisible();
      await expect(childProductLink).toBeVisible();
    });
  });
});
