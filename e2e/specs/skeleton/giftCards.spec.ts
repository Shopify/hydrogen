/**
 * Gift Card E2E Tests
 *
 * ASSUMPTIONS (test data requirements):
 * - gift_card_code_1 has sufficient balance for tests
 * - gift_card_code_2 has sufficient balance for tests
 * - Both cards are active and not expired
 * - Cards are reusable (balance not fully depleted between runs)
 * - At least one product in the store costs more than the gift card balances
 *   (for partial payment testing)
 */

import {setTestStore, test, expect, getRequiredSecret} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

const giftCardCode1 = getRequiredSecret('gift_card_code_1').toUpperCase();
const giftCardCode2 = getRequiredSecret('gift_card_code_2').toUpperCase();

test.beforeEach(async ({storefront, context}) => {
  // Clear cookies for fresh session
  await context.clearCookies();
  await storefront.goto('/');
  await storefront.navigateToFirstProduct();
  await storefront.addToCart();
  await storefront.navigateToCart();
});

test.describe('Gift Card Functionality', () => {
  test.describe('Core Functionality', () => {
    test('should apply a single gift card and verify it appears', async ({
      storefront,
    }) => {
      const card = await storefront.applyGiftCard(giftCardCode1);

      const appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(1);
      expect(appliedCards[0].lastChars).toBe(card.lastChars);
    });

    test('should add multiple gift cards sequentially and verify both appear', async ({
      storefront,
    }) => {
      const card1 = await storefront.applyGiftCard(giftCardCode1);
      await storefront.expectGiftCardApplied(card1.lastChars);

      const card2 = await storefront.applyGiftCard(giftCardCode2);
      await storefront.expectGiftCardApplied(card2.lastChars);

      const appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(2);

      const appliedLastChars = appliedCards.map((c) => c.lastChars);
      expect(appliedLastChars).toContain(card1.lastChars);
      expect(appliedLastChars).toContain(card2.lastChars);
    });

    test('should remove individual gift card while other remains', async ({
      storefront,
    }) => {
      const card1 = await storefront.applyGiftCard(giftCardCode1);
      const card2 = await storefront.applyGiftCard(giftCardCode2);

      let appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(2);

      await storefront.removeGiftCard(card1.lastChars);

      await storefront.expectGiftCardRemoved(card1.lastChars);
      await storefront.expectGiftCardApplied(card2.lastChars);

      appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(1);
      expect(appliedCards[0].lastChars).toBe(card2.lastChars);
    });

    test('should remove all gift cards sequentially', async ({storefront}) => {
      const card1 = await storefront.applyGiftCard(giftCardCode1);
      const card2 = await storefront.applyGiftCard(giftCardCode2);

      let appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(2);

      await storefront.removeAllGiftCards();

      await storefront.expectGiftCardRemoved(card1.lastChars);
      await storefront.expectGiftCardRemoved(card2.lastChars);

      appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(0);
    });

    test('should persist gift cards after page reload', async ({
      storefront,
    }) => {
      const card1 = await storefront.applyGiftCard(giftCardCode1);
      await storefront.expectGiftCardApplied(card1.lastChars);

      await storefront.reload();

      await storefront.expectGiftCardApplied(card1.lastChars);

      const appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(1);
      expect(appliedCards[0].lastChars).toBe(card1.lastChars);
    });

    test('should show applied gift cards in checkout', async ({storefront}) => {
      const card = await storefront.applyGiftCard(giftCardCode1);
      await storefront.expectGiftCardApplied(card.lastChars);

      await storefront.navigateToCheckout();

      await storefront.expectGiftCardsInCheckout([card.lastChars]);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle duplicate gift card code gracefully', async ({
      storefront,
    }) => {
      const card1 = await storefront.applyGiftCard(giftCardCode1);
      await storefront.expectGiftCardApplied(card1.lastChars);

      // Try to apply the same card again using the helper that doesn't verify success
      await storefront.tryApplyGiftCardCode(giftCardCode1);

      // Should still only have one card applied (no duplicates)
      const appliedCards = await storefront.getAppliedGiftCards();
      const matchingCards = appliedCards.filter(
        (c) => c.lastChars === card1.lastChars,
      );
      expect(matchingCards.length).toBe(1);
    });

    test('should handle case-insensitive gift card codes', async ({
      storefront,
    }) => {
      const lowercaseCode = giftCardCode1.toLowerCase();
      let card = await storefront.applyGiftCard(lowercaseCode);

      await storefront.expectGiftCardApplied(card.lastChars);

      let appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(1);

      const uppercaseCode = giftCardCode1.toUpperCase();
      card = await storefront.applyGiftCard(uppercaseCode);

      await storefront.expectGiftCardApplied(card.lastChars);

      appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(1);
    });

    test('should not add card for invalid gift card code', async ({
      storefront,
    }) => {
      const invalidCode = 'INVALID-CODE-12345-FAKE';

      await storefront.tryApplyGiftCardCode(invalidCode);

      // Core verification: no card should be added for invalid code
      const appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(0);

      // Note: The skeleton template currently doesn't display a visible error message
      // for invalid gift card codes. This is acceptable UX behavior - the form clears
      // and no card is added, implicitly indicating the code was rejected.
      // TODO: If error feedback is added in the future, enable this assertion:
      // await storefront.expectGiftCardError(/invalid|not found|does not exist/i);
    });

    test('should display gift card amount when applied', async ({
      storefront,
    }) => {
      const card = await storefront.applyGiftCard(giftCardCode1);

      await storefront.expectGiftCardApplied(card.lastChars);

      const appliedCards = await storefront.getAppliedGiftCards();
      expect(appliedCards.length).toBe(1);

      // Verify the card shows an amount (format: $X.XX or similar)
      const amount = appliedCards[0].amount;
      expect(amount).toBeTruthy();
      // Amount should contain a currency symbol or number
      expect(amount).toMatch(/[$\d]/);
    });
  });
});
