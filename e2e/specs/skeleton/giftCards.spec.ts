import {setTestStore, test, expect, getRequiredSecret} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

const GIFT_CARD_1 = getRequiredSecret('gift_card_code_1');
const GIFT_CARD_2 = getRequiredSecret('gift_card_code_2');
const GIFT_CARD_1_LAST_4 = GIFT_CARD_1.slice(-4).toUpperCase();
const GIFT_CARD_2_LAST_4 = GIFT_CARD_2.slice(-4).toUpperCase();

const PRODUCT_NAME = 'The Element';

test.describe('Gift Cards', () => {
  test.beforeEach(async ({page, cart}) => {
    await page.goto('/');

    const productLink = page.getByRole('link', {name: PRODUCT_NAME});
    const addToCartButton = page.getByRole('button', {name: 'Add to cart'});
    const cartDialog = page.getByRole('dialog');

    await productLink.click();
    await addToCartButton.click();
    await expect(cartDialog).toBeVisible();
    await cart.closeCartAside();
    await cart.navigateToCartPage();
  });

  test.describe('Core Functionality', () => {
    test('applies single gift card', async ({giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
    });

    test('applies multiple gift cards', async ({giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.applyCode(GIFT_CARD_2);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertAppliedCard(GIFT_CARD_2_LAST_4);
    });

    test('removes individual gift card while other remains', async ({
      giftCard,
    }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.applyCode(GIFT_CARD_2);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertAppliedCard(GIFT_CARD_2_LAST_4);

      await giftCard.removeCard(GIFT_CARD_1_LAST_4);

      await giftCard.assertCardRemoved(GIFT_CARD_1_LAST_4);
      await giftCard.assertAppliedCard(GIFT_CARD_2_LAST_4);
    });

    test('removes all gift cards sequentially', async ({giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.applyCode(GIFT_CARD_2);

      await giftCard.removeCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardRemoved(GIFT_CARD_1_LAST_4);

      await giftCard.removeCard(GIFT_CARD_2_LAST_4);
      await giftCard.assertCardRemoved(GIFT_CARD_2_LAST_4);

      await giftCard.assertNoGiftCards();
    });

    test('persists gift cards after page reload', async ({page, giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await page.reload();

      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
    });

    test('displays gift card amount when applied', async ({page, giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      const giftCards = page.getByLabel('Applied Gift Card(s)');
      const cardGroup = giftCards
        .getByRole('group')
        .filter({hasText: `***${GIFT_CARD_1_LAST_4}`});

      await expect(cardGroup).toContainText(/[$\d]/);
    });

    test('shows applied gift cards in checkout', async ({page, giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      const checkoutLink = page.getByRole('link', {
        name: /continue to checkout/i,
      });
      await checkoutLink.click();

      const costSummary = page.getByLabel('Cost summary');
      await expect(
        costSummary.getByText(`•••• ${GIFT_CARD_1_LAST_4}`),
      ).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('handles duplicate gift card code', async ({page, giftCard}) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.tryApplyCode(GIFT_CARD_1);

      const giftCards = page.getByLabel('Applied Gift Card(s)');
      await expect(
        giftCards
          .getByRole('group')
          .filter({hasText: `***${GIFT_CARD_1_LAST_4}`}),
      ).toHaveCount(1);
    });

    test('handles case-insensitive gift card codes', async ({giftCard}) => {
      const lowercaseCode = GIFT_CARD_1.toLowerCase();
      await giftCard.applyCode(lowercaseCode);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.removeCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardRemoved(GIFT_CARD_1_LAST_4);

      const uppercaseCode = GIFT_CARD_1.toUpperCase();
      await giftCard.applyCode(uppercaseCode);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
    });

    test('does not add invalid gift card', async ({giftCard}) => {
      const invalidCode = 'INVALID-CODE-12345';
      await giftCard.tryApplyCode(invalidCode);

      await giftCard.assertNoGiftCards();
    });
  });
});
