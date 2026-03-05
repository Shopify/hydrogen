import {setTestStore, test} from '../../fixtures';
import {AccountPage} from '../../fixtures/account-utils';

setTestStore('mockShop', {
  mock: {
    scenario: 'customer-account-logged-in',
  },
});

test.describe('Account route with MSW Customer Account mocks', () => {
  test('renders /account as logged in', async ({page}) => {
    const accountPage = new AccountPage(page);

    await accountPage.goto();
    await accountPage.expectLoggedInState('Taylor');
  });
});
