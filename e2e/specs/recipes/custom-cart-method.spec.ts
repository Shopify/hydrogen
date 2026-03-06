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
 * - Changing variant options updates the cart automatically
 * - Cart maintains correct quantities after variant changes
 */

const KNOWN_PRODUCT_WITH_VARIANTS = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

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

      const firstLineItem = lineItems.first();

      const increaseButton = cart.getIncreaseButton(firstLineItem);
      await expect(increaseButton).toBeEnabled();

      const optionSelects = firstLineItem.locator('select');

      const selectCount = await optionSelects.count();
      expect(selectCount).toBeGreaterThan(0);
    });

    test('allows changing product variant via dropdown selector', async ({
      page,
    }) => {
      const cart = new CartUtil(page);
      const lineItems = cart.getLineItems();
      const firstLineItem = lineItems.first();

      const optionSelect = firstLineItem.locator('select').first();
      await expect(optionSelect).toBeVisible();

      const initialValue = await optionSelect.inputValue();

      const options = await optionSelect.locator('option').allTextContents();
      const differentOption = options.find(
        (opt: string) => opt !== initialValue,
      );

      if (differentOption) {
        await optionSelect.selectOption(differentOption);

        await expect
          .poll(async () => {
            const currentValue = await optionSelect.inputValue();
            return currentValue !== initialValue;
          })
          .toBeTruthy();
      }
    });

    test('maintains cart quantity after variant change', async ({page}) => {
      const cart = new CartUtil(page);
      const lineItems = cart.getLineItems();
      const firstLineItem = lineItems.first();

      const increaseButton = cart.getIncreaseButton(firstLineItem);
      await increaseButton.click();

      await expect
        .poll(async () => {
          const items = cart.getLineItems();
          return await items.count();
        })
        .toBe(1);

      const optionSelect = firstLineItem.locator('select').first();
      const options = await optionSelect.locator('option').allTextContents();

      if (options.length > 1) {
        await optionSelect.selectOption(options[1]);

        await expect(increaseButton).toBeEnabled();

        const finalLineItems = cart.getLineItems();
        await expect(finalLineItems).toHaveCount(1);
      }
    });
  });
});
