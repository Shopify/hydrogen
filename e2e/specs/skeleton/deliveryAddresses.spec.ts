import {setTestStore, test, expect, MSW_SCENARIOS} from '../../fixtures';
import {DELIVERY_ADDRESS_SEED_COUNT} from '../../fixtures/msw/handlers';
import {
  DeliveryAddressUtil,
  type AddressFormData,
} from '../../fixtures/delivery-address-utils';

setTestStore('mockShop', {
  mock: {scenario: MSW_SCENARIOS.deliveryAddresses},
});

const NEW_ADDRESS: AddressFormData = {
  firstName: 'New',
  lastName: 'Address',
  company: 'TestCo',
  address1: '789 Pine Rd',
  address2: 'Suite 100',
  city: 'Portland',
  zoneCode: 'OR',
  zip: '97201',
  territoryCode: 'US',
  phoneNumber: '+15035551234',
};

test.describe('Delivery Addresses', () => {
  // Serial mode is required because MSW mutable state is shared across tests,
  // so CRUD operations accumulate (e.g., Create adds an address that Update
  // and Delete tests then operate on).
  test.describe.configure({mode: 'serial'});

  test.describe('Read', () => {
    test('renders existing addresses', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      await addresses.assertAddressCount(DELIVERY_ADDRESS_SEED_COUNT);
    });

    test('shows the create address form', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      const createForm = addresses.getCreateAddressForm();
      await expect(createForm).toBeVisible();
      await expect(
        createForm.getByRole('button', {name: 'Create'}),
      ).toBeVisible();
    });

    test('displays default address checkbox state', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      const existingForms = addresses.getExistingAddresses();
      const firstCheckbox = existingForms.first().getByRole('checkbox');
      await expect(firstCheckbox).toBeChecked();

      const secondCheckbox = existingForms.nth(1).getByRole('checkbox');
      await expect(secondCheckbox).not.toBeChecked();
    });
  });

  test.describe('Create', () => {
    test('creates a new address', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      await addresses.assertAddressCount(DELIVERY_ADDRESS_SEED_COUNT);
      await addresses.createAddress(NEW_ADDRESS);

      await addresses.assertAddressCount(DELIVERY_ADDRESS_SEED_COUNT + 1);
      await addresses.assertAddressVisible({
        firstName: NEW_ADDRESS.firstName,
        address1: NEW_ADDRESS.address1,
      });
    });
  });

  test.describe('Update', () => {
    test('updates an existing address', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      const updatedCity = 'New Portland';
      const existingForms = addresses.getExistingAddresses();
      const targetForm = existingForms.first();

      await expect(targetForm.getByLabel('City')).not.toHaveValue(updatedCity);
      await addresses.updateAddress(targetForm, {city: updatedCity});

      // Re-navigate to verify the mutation persisted in MSW closure state.
      // Without this, the assertion would pass from the user-typed DOM value
      // alone, since the form uses uncontrolled inputs (defaultValue).
      await addresses.navigateToAddresses();
      await addresses.assertAddressVisible({city: updatedCity});
    });
  });

  test.describe('Default Address', () => {
    test('toggles default address to a different address', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      const existingForms = addresses.getExistingAddresses();
      const firstForm = existingForms.first();
      const secondForm = existingForms.nth(1);

      await expect(firstForm.getByRole('checkbox')).toBeChecked();
      await expect(secondForm.getByRole('checkbox')).not.toBeChecked();

      await addresses.updateAddress(secondForm, {defaultAddress: true});

      // Re-navigate to verify the default toggle persisted in MSW state.
      // The checkbox uses defaultChecked (uncontrolled), and key={address.id}
      // is stable across default-toggle updates, so React reconciles in place
      // without resetting the checkbox DOM state. Fresh mount is needed.
      await addresses.navigateToAddresses();

      const refreshedForms = addresses.getExistingAddresses();
      await expect(
        refreshedForms.first().getByRole('checkbox'),
      ).not.toBeChecked();
      await expect(refreshedForms.nth(1).getByRole('checkbox')).toBeChecked();
    });
  });

  test.describe('Delete', () => {
    test('deletes an address and decreases count', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      const countBefore = await addresses.getExistingAddresses().count();
      expect(countBefore).toBeGreaterThan(0);
      const lastForm = addresses.getExistingAddresses().last();
      await addresses.deleteAddress(lastForm);

      await addresses.assertAddressCount(countBefore - 1);
    });

    test('shows empty state when all addresses are deleted', async ({page}) => {
      const addresses = new DeliveryAddressUtil(page);
      await addresses.navigateToAddresses();

      await expect(addresses.getEmptyState()).toHaveCount(0);
      const remaining = await addresses.getExistingAddresses().count();
      for (let i = 0; i < remaining; i++) {
        const form = addresses.getExistingAddresses().first();
        await addresses.deleteAddress(form);
      }

      await expect(addresses.getEmptyState()).toBeVisible();
    });
  });
});
