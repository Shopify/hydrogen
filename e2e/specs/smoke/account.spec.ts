import {setTestStore, test} from '../../fixtures';

setTestStore('mockShop', {
  mock: {
    scenario: 'customer-account-logged-in',
  },
});

test.describe('Account route with MSW Customer Account mocks', () => {
  test('renders /account as logged in', async ({account}) => {
    await account.goto();
    await account.assertLoggedInState('Taylor');
  });
});
