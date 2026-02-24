import {expect, Page} from '@playwright/test';

export class GiftCardUtil {
  constructor(private page: Page) {}

  async applyCode(code: string) {
    const input = this.page.getByRole('textbox', {name: 'Gift card code'});
    await input.fill(code);
    const applyButton = this.page.getByRole('button', {
      name: 'Apply gift card code',
    });
    await applyButton.click();
    await expect(applyButton).toBeEnabled();
    await expect(input).toHaveValue('');
  }

  async assertAppliedCard(lastFourChars: string) {
    const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
    await expect(
      giftCards.locator('dd').filter({hasText: `***${lastFourChars}`}),
    ).toBeVisible();
  }

  async removeCard(lastFourChars: string) {
    const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
    const cardElement = giftCards
      .locator('dd')
      .filter({hasText: `***${lastFourChars}`});
    await cardElement
      .getByRole('button', {
        name: `Remove gift card ending in ${lastFourChars}`,
      })
      .click();
  }

  async assertCardRemoved(lastFourChars: string) {
    const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
    await expect(
      giftCards.locator('dd').filter({hasText: `***${lastFourChars}`}),
    ).toHaveCount(0);
  }

  async assertCardCodeNotPresent(lastFourChars: string) {
    await expect(this.page.getByText(`***${lastFourChars}`)).toHaveCount(0);
  }

  async assertNoGiftCards() {
    await expect(this.page.getByText('Applied Gift Card(s)')).toHaveCount(0);
  }

  async assertCardHasAmount(lastFourChars: string, pattern?: RegExp) {
    const giftCards = this.page.getByRole('region', {name: 'Gift cards'});
    const cardElement = giftCards
      .locator('dd')
      .filter({hasText: `***${lastFourChars}`});
    await expect(cardElement).toContainText(pattern || /[$\d]/);
  }
}
