export async function loader({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.get();

  // Optional parameters
  const result2 = await cart.get({
    cartId: '123', // override the cart id
    numCartLines: 50, //override to return 50 cart lines
    country: 'US', // override the country code to 'US'
    language: 'EN', // override the language code to 'EN'
  });
}
