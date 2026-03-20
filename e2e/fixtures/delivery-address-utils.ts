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
    const countBefore = await this.getExistingAddresses().count();
    const form = this.getCreateAddressForm();
    await this.fillAddressForm(form, data);
    const createButton = form.getByRole('button', {name: 'Create'});
    await createButton.click();
    // Wait for a new existing-address form to appear, proving the full
    // create -> revalidate -> re-render cycle completed.
    await this.assertAddressCount(countBefore + 1);
  }

  // DEVIATION: waitForResponse is used here despite the e2e guideline to
  // "wait for the visible effect rather than the underlying mechanism."
  // The skeleton's AddressForm has no visible success feedback (no toast, no
  // flash), and the inputs are uncontrolled (defaultValue) so user-typed values
  // persist in the DOM regardless of mutation success. There is no user-visible
  // effect to wait for. Tests that call updateAddress must re-navigate afterward
  // to verify persistence via a fresh mount from MSW state.
  async updateAddress(form: Locator, data: Partial<AddressFormData>) {
    await this.fillAddressForm(form, data);
    const saveButton = form.getByRole('button', {name: 'Save'});
    const actionResponse = this.page.waitForResponse((res) =>
      res.url().includes('/account/addresses'),
    );
    await saveButton.click();
    await actionResponse;
  }

  async deleteAddress(form: Locator) {
    const countBefore = await this.getExistingAddresses().count();
    const deleteButton = form.getByRole('button', {name: 'Delete'});
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    // Wait for the address count to decrease, proving the full
    // delete -> revalidate -> re-render cycle completed. We can't use
    // not.toBeVisible() on the delete button because Playwright locators
    // are lazy: after the form is removed, .first()/.last() shifts to
    // the next form whose delete button IS visible.
    await this.assertAddressCount(countBefore - 1);
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
