import {expect, Page} from '@playwright/test';

export class GiftCardUtil {
  constructor(private page: Page) {}

  async applyCode(code: string) {
    const input = this.page.getByRole('textbox', {name: 'Gift card code'});
    await input.fill(code);
    await this.page.getByRole('button', {name: 'Apply gift card code'}).click();
    await expect(input).toHaveValue('');
  }

  async tryApplyCode(code: string) {
    const input = this.page.getByRole('textbox', {name: 'Gift card code'});
    await input.fill(code);
    await this.page.getByRole('button', {name: 'Apply gift card code'}).click();
  }

  async assertAppliedCard(lastFourChars: string) {
    const giftCards = this.page.getByLabel('Applied Gift Card(s)');
    await expect(
      giftCards.getByRole('group').filter({hasText: `***${lastFourChars}`}),
    ).toBeVisible();
  }

  async removeCard(lastFourChars: string) {
    const giftCards = this.page.getByLabel('Applied Gift Card(s)');
    const cardGroup = giftCards
      .getByRole('group')
      .filter({hasText: `***${lastFourChars}`});
    await cardGroup.getByRole('button', {name: 'Remove gift card'}).click();
  }

  async assertCardRemoved(lastFourChars: string) {
    const giftCards = this.page.getByLabel('Applied Gift Card(s)');
    await expect(
      giftCards.getByRole('group').filter({hasText: `***${lastFourChars}`}),
    ).not.toBeVisible();
  }

  async assertNoGiftCards() {
    const giftCards = this.page.getByLabel('Applied Gift Card(s)');
    await expect(giftCards.getByRole('group')).not.toBeVisible();
  }
}
