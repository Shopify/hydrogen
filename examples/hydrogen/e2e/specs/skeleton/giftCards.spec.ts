import { setTestStore, test, expect, getRequiredSecret } from "../../fixtures";

// TODO-HYDROGEN-E2E: re-enable when Hydrogen dev-preview models applied gift cards and
// gift-card cart mutations, or when these specs are rewritten for current UX.
const GIFT_CARD_E2E_DISABLED = true;
test.skip(
  GIFT_CARD_E2E_DISABLED,
  "TODO-HYDROGEN-E2E: gift-card UI was removed during Hydrogen dev-preview cart migration.",
);

if (!GIFT_CARD_E2E_DISABLED) {
  setTestStore("hydrogenPreviewStorefront");
}

const GIFT_CARD_1 = GIFT_CARD_E2E_DISABLED ? "" : getRequiredSecret("gift_card_code_1");
const GIFT_CARD_2 = GIFT_CARD_E2E_DISABLED ? "" : getRequiredSecret("gift_card_code_2");
const GIFT_CARD_1_LAST_4 = GIFT_CARD_1.slice(-4).toUpperCase();
const GIFT_CARD_2_LAST_4 = GIFT_CARD_2.slice(-4).toUpperCase();

const PRODUCT_NAME = "The Element";
const PRODUCT_HANDLE = "the-element";

test.describe("Gift Cards", () => {
  test.beforeEach(async ({ page, cart, giftCard }) => {
    await page.goto(`/products/${PRODUCT_HANDLE}`);
    await cart.addItem(PRODUCT_NAME);
    await cart.closeCartAside();
    await cart.navigateToCartPage();
    await giftCard.assertNoGiftCards();
  });

  test.describe("Core Functionality", () => {
    test("applies single gift card", async ({ giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
    });

    test("applies multiple gift cards", async ({ giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.applyCode(GIFT_CARD_2);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertAppliedCard(GIFT_CARD_2_LAST_4);
    });

    test("removes individual gift card while other remains", async ({ giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.applyCode(GIFT_CARD_2);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertAppliedCard(GIFT_CARD_2_LAST_4);

      await giftCard.removeCard(GIFT_CARD_1_LAST_4);

      await giftCard.assertCardRemoved(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardCodeNotPresent(GIFT_CARD_1_LAST_4);
      await giftCard.assertAppliedCard(GIFT_CARD_2_LAST_4);
    });

    test("removes all gift cards sequentially", async ({ giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.applyCode(GIFT_CARD_2);

      await giftCard.removeCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardRemoved(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardCodeNotPresent(GIFT_CARD_1_LAST_4);

      await giftCard.removeCard(GIFT_CARD_2_LAST_4);
      await giftCard.assertCardRemoved(GIFT_CARD_2_LAST_4);
      await giftCard.assertCardCodeNotPresent(GIFT_CARD_2_LAST_4);

      await giftCard.assertNoGiftCards();
    });

    test("persists gift cards after page reload", async ({ page, giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await page.reload();

      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
    });

    test("displays gift card amount when applied", async ({ giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.assertCardHasAmount(GIFT_CARD_1_LAST_4);
    });

    test("shows applied gift cards in checkout", async ({ page, giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      const checkoutLink = page.getByRole("link", {
        name: /continue to checkout/i,
      });
      await checkoutLink.click();

      const costSummary = page.getByLabel("Cost summary");
      await expect(
        costSummary.getByText(new RegExp(`[•*\\-]{4}\\s*${GIFT_CARD_1_LAST_4}`)),
      ).toBeVisible();
    });
  });

  test.describe("Edge Cases", () => {
    test("handles duplicate gift card code", async ({ page, giftCard }) => {
      await giftCard.applyCode(GIFT_CARD_1);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.applyCode(GIFT_CARD_1);

      const giftCards = page.getByRole("region", { name: "Gift cards" });
      await expect(
        giftCards.locator("dd").filter({ hasText: `***${GIFT_CARD_1_LAST_4}` }),
      ).toHaveCount(1);
    });

    test("handles case-insensitive gift card codes", async ({ giftCard }) => {
      const lowercaseCode = GIFT_CARD_1.toLowerCase();
      await giftCard.applyCode(lowercaseCode);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);

      await giftCard.removeCard(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardRemoved(GIFT_CARD_1_LAST_4);
      await giftCard.assertCardCodeNotPresent(GIFT_CARD_1_LAST_4);

      const uppercaseCode = GIFT_CARD_1.toUpperCase();
      await giftCard.applyCode(uppercaseCode);
      await giftCard.assertAppliedCard(GIFT_CARD_1_LAST_4);
    });

    test("does not add invalid gift card", async ({ giftCard }) => {
      // Note: the skeleton template shows no error message for invalid codes -
      // the form clears silently. This is a known UX gap.
      const invalidCode = "INVALID-CODE-12345";
      await giftCard.applyCode(invalidCode);
      await giftCard.assertNoGiftCards();
    });
  });
});
