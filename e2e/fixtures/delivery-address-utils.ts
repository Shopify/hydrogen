import {expect, Locator, Page} from '@playwright/test';

export const EMPTY_STATE_MESSAGE = 'You have no addresses saved.';

export interface AddressFormData {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  zoneCode: string;
  zip: string;
  territoryCode: string;
  phoneNumber?: string;
  defaultAddress?: boolean;
}

export class DeliveryAddressUtil {
  constructor(private page: Page) {}

  async navigateToAddresses() {
    await this.page.goto('/account/addresses');
    await expect(
      this.page.getByRole('heading', {level: 2, name: 'Addresses'}),
    ).toBeVisible();
  }

  /**
   * Returns each existing address form (excluding the create form).
   * The create form has id="NEW_ADDRESS_ID"; existing forms have GID-based ids.
   * We select forms with Save/Delete buttons, which only appear on existing addresses.
   */
  getExistingAddresses(): Locator {
    return this.page
      .locator('form')
      .filter({has: this.page.getByRole('button', {name: 'Save'})});
  }

  getCreateAddressForm(): Locator {
    return this.page
      .locator('form')
      .filter({has: this.page.getByRole('button', {name: 'Create'})});
  }

  getEmptyState(): Locator {
    return this.page.getByText(EMPTY_STATE_MESSAGE);
  }

  private static readonly FIELD_LABEL_MAP: Record<
    keyof Omit<AddressFormData, 'defaultAddress'>,
    string
  > = {
    firstName: 'First name',
    lastName: 'Last name',
    company: 'Company',
    address1: 'Address line 1',
    address2: 'Address line 2',
    city: 'City',
    zoneCode: 'State/Province',
    zip: 'Zip',
    territoryCode: 'Country code',
    phoneNumber: 'Phone Number',
  };

  async fillAddressForm(form: Locator, data: Partial<AddressFormData>) {
    for (const [field, label] of Object.entries(
      DeliveryAddressUtil.FIELD_LABEL_MAP,
    )) {
      const value = data[field as keyof typeof data];
      if (value !== undefined && typeof value === 'string') {
        await form.getByLabel(label).fill(value);
      }
    }
    if (data.defaultAddress !== undefined) {
      const checkbox = form.getByRole('checkbox');
      const isChecked = await checkbox.isChecked();
      if (data.defaultAddress !== isChecked) {
        await checkbox.click();
      }
    }
  }

  async createAddress(data: AddressFormData) {
    const form = this.getCreateAddressForm();
    await this.fillAddressForm(form, data);
    const createButton = form.getByRole('button', {name: 'Create'});
    await createButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async updateAddress(form: Locator, data: Partial<AddressFormData>) {
    await this.fillAddressForm(form, data);
    const saveButton = form.getByRole('button', {name: 'Save'});
    await saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async deleteAddress(form: Locator) {
    const deleteButton = form.getByRole('button', {name: 'Delete'});
    await deleteButton.click();
    // Wait for the form to be removed from the DOM, which proves the full
    // delete → revalidate → re-render cycle completed. Unlike networkidle,
    // this is a DOM-level signal that can't fire prematurely.
    await expect(deleteButton).not.toBeVisible();
  }

  async assertAddressCount(count: number) {
    if (count === 0) {
      await expect(this.getEmptyState()).toBeVisible();
      return;
    }
    await expect(this.getExistingAddresses()).toHaveCount(count);
  }

  async assertAddressVisible(
    data: Partial<Omit<AddressFormData, 'defaultAddress'>>,
  ) {
    const entries = Object.entries(data).map(([field, value]) => ({
      label:
        DeliveryAddressUtil.FIELD_LABEL_MAP[
          field as keyof typeof DeliveryAddressUtil.FIELD_LABEL_MAP
        ],
      value: value as string,
    }));

    if (entries.length === 0) {
      throw new Error('assertAddressVisible requires at least one field');
    }

    const [matchField, ...remainingFields] = entries;
    const forms = this.getExistingAddresses();
    const count = await forms.count();

    for (let i = 0; i < count; i++) {
      const form = forms.nth(i);
      const actual = await form.getByLabel(matchField.label).inputValue();
      if (actual === matchField.value) {
        for (const field of remainingFields) {
          await expect(form.getByLabel(field.label)).toHaveValue(field.value);
        }
        return;
      }
    }

    throw new Error(
      `No address found matching ${matchField.label}="${matchField.value}"`,
    );
  }
}
