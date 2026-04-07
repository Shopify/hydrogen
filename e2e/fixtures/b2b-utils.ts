import {expect, type Page} from '@playwright/test';

/**
 * B2B-specific test utilities for the B2B recipe.
 * Provides helpers for company location selection, quantity rules,
 * and price break assertions.
 */
export class B2BUtil {
  constructor(private page: Page) {}

  getLocationModalHeading(companyName: string) {
    return this.page.getByRole('heading', {
      name: `Logged in for ${companyName}`,
    });
  }

  getChooseLocationLegend() {
    return this.page.getByText('Choose a location:');
  }

  getLocationButtons() {
    return this.page.getByRole('button', {
      name: /Select B2B location:/,
    });
  }

  getLocationButton(locationName: string) {
    return this.page.getByRole('button', {
      name: `Select B2B location: ${locationName}`,
    });
  }

  getChangeLocationButton(selectedLocationName?: string) {
    const buttonName = selectedLocationName ?? /Select Location/;
    return this.page
      .getByRole('navigation')
      .getByRole('button', {name: buttonName});
  }

  getQuantityRulesHeading() {
    return this.page.getByRole('heading', {name: 'Quantity Rules', level: 4});
  }

  getQuantityRulesTable() {
    return this.page
      .getByRole('table')
      .filter({has: this.page.getByRole('columnheader', {name: 'Increment'})});
  }

  getVolumePricingHeading() {
    return this.page.getByRole('heading', {name: 'Volume Pricing', level: 4});
  }

  getVolumePricingTable() {
    return this.page.getByRole('table').filter({
      has: this.page.getByRole('columnheader', {name: 'Minimum Quantity'}),
    });
  }

  async assertLocationModalVisible(companyName: string) {
    await expect(this.getLocationModalHeading(companyName)).toBeVisible();
    await expect(this.getChooseLocationLegend()).toBeVisible();
    await expect(this.getLocationButtons().first()).toBeVisible();
  }

  async assertLocationModalHidden(companyName: string) {
    await expect(this.getLocationModalHeading(companyName)).not.toBeVisible();
  }

  async selectLocation(companyName: string, locationName: string) {
    const button = this.getLocationButton(locationName);
    await expect(button).toBeVisible();
    await button.click();
    await this.assertLocationModalHidden(companyName);
  }

  async assertQuantityRulesVisible() {
    await expect(this.getQuantityRulesHeading()).toBeVisible();
    await expect(this.getQuantityRulesTable()).toBeVisible();
  }

  async assertQuantityRulesHidden() {
    await expect(this.getQuantityRulesHeading()).not.toBeVisible();
  }

  async assertQuantityRuleValues(
    increment: string,
    minimum: string,
    maximum: string,
  ) {
    const table = this.getQuantityRulesTable();
    const dataRow = table.getByRole('row').nth(1);
    const cells = dataRow.getByRole('cell');

    await expect(cells.nth(0)).toHaveText(increment);
    await expect(cells.nth(1)).toHaveText(minimum);
    await expect(cells.nth(2)).toHaveText(maximum);
  }

  async assertVolumePricingVisible() {
    await expect(this.getVolumePricingHeading()).toBeVisible();
    await expect(this.getVolumePricingTable()).toBeVisible();
  }

  async assertVolumePricingHidden() {
    await expect(this.getVolumePricingHeading()).not.toBeVisible();
  }
}
