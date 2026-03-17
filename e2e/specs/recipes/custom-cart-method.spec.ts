import {test, expect, setRecipeFixture} from '../../fixtures';
import {CartUtil} from '../../fixtures/cart-utils';

setRecipeFixture({
  recipeName: 'custom-cart-method',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Custom Cart Method recipe, which enables customers to change
 * product variants directly within the cart using inline dropdown selectors.
 *
 * Tests cover:
 * - Product option selectors display in cart line items
 * - Variant changes update product link URLs
 * - Cart maintains single line item when variant changes
 * - Updates happen without page reload
 */

const KNOWN_PRODUCT_WITH_VARIANTS = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

const getFirstLineItem = (cart: CartUtil) => cart.getLineItems().first();

test.describe('Custom Cart Method Recipe', () => {
  test.describe('Cart Line Item Variant Selector', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/products/${KNOWN_PRODUCT_WITH_VARIANTS.handle}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: KNOWN_PRODUCT_WITH_VARIANTS.name,
        }),
      ).toBeVisible();

      const addToCartButton = page.getByRole('button', {
        name: /add to cart/i,
      });
      await addToCartButton.click();

      const cartDialog = page.getByRole('dialog', {name: 'Cart'});
      await expect(cartDialog).toBeVisible();

      const cart = new CartUtil(page);
      const lineItems = cart.getLineItems();
      await expect(lineItems.first()).toBeVisible();
    });

    test('displays product option selectors in cart line items', async ({
      page,
    }) => {
      const cart = new CartUtil(page);
      const lineItems = cart.getLineItems();
      await expect(lineItems).toHaveCount(1);

      const firstLineItem = getFirstLineItem(cart);

      const increaseButton = cart.getIncreaseButton(firstLineItem);
      await expect(increaseButton).toBeEnabled();

      const optionSelects = await cart.getOptionSelectors(firstLineItem);

      const selectCount = await optionSelects.count();
      expect(selectCount).toBeGreaterThan(0);
    });

    test('changes product variant and updates cart line item', async ({
      page,
    }) => {
      const cart = new CartUtil(page);
      const firstLineItem = getFirstLineItem(cart);

      const productLink = firstLineItem.getByRole('link').first();
      const initialUrl = await productLink.getAttribute('href');
      expect(initialUrl).toBeTruthy();

      const optionSelect = (
        await cart.getOptionSelectors(firstLineItem)
      ).first();
      const {optionName, nextValue} =
        await cart.selectDifferentOption(optionSelect);

      await expect
        .poll(async () => {
          const href = await productLink.getAttribute('href');
          if (!href) {
            return false;
          }

          const updatedProductUrl = new URL(href, page.url());
          return (
            href !== initialUrl &&
            updatedProductUrl.searchParams.get(optionName) === nextValue
          );
        })
        .toBe(true);
    });

    test('maintains single line item when changing variants', async ({
      page,
    }) => {
      const cart = new CartUtil(page);
      const firstLineItem = getFirstLineItem(cart);

      const increaseButton = cart.getIncreaseButton(firstLineItem);
      await increaseButton.click();

      await expect(cart.getLineItems()).toHaveCount(1);
      await expect(firstLineItem).toContainText('Quantity: 2');

      const optionSelect = (
        await cart.getOptionSelectors(firstLineItem)
      ).first();
      await cart.selectDifferentOption(optionSelect);

      await expect(cart.getLineItems()).toHaveCount(1);
      await expect(firstLineItem).toContainText('Quantity: 2');
    });

    test('updates without page reload when variant changes', async ({page}) => {
      const cart = new CartUtil(page);
      const firstLineItem = getFirstLineItem(cart);

      const cartDialog = page.getByRole('dialog', {name: 'Cart'});
      await expect(cartDialog).toBeVisible();
      const initialPageUrl = page.url();

      const optionSelect = (
        await cart.getOptionSelectors(firstLineItem)
      ).first();
      await cart.selectDifferentOption(optionSelect);

      expect(page.url()).toBe(initialPageUrl);
      await expect(cartDialog).toBeVisible();
    });
  });
});
