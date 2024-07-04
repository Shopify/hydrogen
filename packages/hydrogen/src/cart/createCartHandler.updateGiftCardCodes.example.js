export async function action({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.updateGiftCardCodes(
    ['ABC123'],
    // Optional parameters
    {
      cartId: '123', // override the cart id
      country: 'US', // override the country code to 'US'
      language: 'EN', // override the language code to 'EN'
    },
  );

  // Output of result:
  // {
  //   cart: {
  //     id: 'c1-123',
  //     appliedGiftCards: [{
  //       lastCharacters: 'C123',
  //       amountUsed: {
  //         amount: 10,
  //         currencyCode: 'USD',
  //       }
  //     }],
  //   },
  //   errors: []
  // }
}
