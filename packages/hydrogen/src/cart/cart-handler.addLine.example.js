// Basic usage
const result = await cart.addLine({
  action: 'CartLinesAdd',
  lines: [
    {
      merchandiseId: '123',
      quantity: 1,
    },
  ],
});

// Output of result:
// {
//   cart: {
//     id: 'c1-123',
//     totalQuantity: 1
//   },
//   errors: []
// }

// Optional parameters
cart.addLine({
  action: 'CartLinesAdd',
  lines: [
    {
      merchandiseId: '123',
      quantity: 1,
    },
  ],
  cartId: '123', // override the cart id
  country: 'US', // override the country code to 'US'
  language: 'EN', // override the language code to 'EN'
});
