import {ComponentProps, useState} from 'react';
import type {Story} from '@ladle/react';
import {CartProvider, storageAvailable, useCart} from './CartProvider.js';
import {type ShopifyProviderProps, ShopifyProvider} from './ShopifyProvider.js';
import {CART_ID_STORAGE_KEY} from './cart-constants.js';
import {
  AttributeInput,
  CartBuyerIdentityInput,
} from './storefront-api-types.js';

const merchandiseId = 'gid://shopify/ProductVariant/41007290482744';

function CartComponent() {
  const {
    status,
    lines,
    note,
    buyerIdentity,
    attributes,
    discountCodes,
    linesAdd,
    cartCreate,
    linesUpdate,
    linesRemove,
    noteUpdate,
    buyerIdentityUpdate,
    cartAttributesUpdate,
    discountCodesUpdate,
  } = useCart();

  const localStorageId = storageAvailable('localStorage')
    ? localStorage.getItem(CART_ID_STORAGE_KEY)
    : null;

  const [lineToAdd, setLineToAdd] = useState(merchandiseId);
  const [lineToRemove, setLineToRemove] = useState('');
  const [lineToUpdate, setLineToUpdate] = useState('');
  const [lineToUpdateQuantity, setLineToUpdateQuantity] = useState(1);
  const [newNote, setNote] = useState('');
  const [newBuyerIdentity, setBuyerIdentity] = useState(
    `{"countryCode": "DE"}`
  );
  const [newCartAttributes, setCartAttributes] = useState(
    '[{"key": "foo", "value": "bar"}]'
  );
  const [newDiscount, setDiscount] = useState('["H2O"]');

  return (
    <>
      <div>
        <h1>This is your current cart</h1>
        <h3>Cart status</h3>
        <p>{status}</p>
        <h3>Fetched from local storage with this cart id</h3>
        <p>{localStorageId}</p>
        <h3>Cart lines</h3>
        <p>{JSON.stringify(lines, null, 2)}</p>
        <h3>Note</h3>
        <p>{note}</p>
        <h3>Buyer identity</h3>
        <p>{JSON.stringify(buyerIdentity)}</p>
        <h3>attributes</h3>
        <p>{JSON.stringify(attributes)}</p>
        <h3>discounts</h3>
        <p>{JSON.stringify(discountCodes)}</p>
      </div>
      <div>
        <h2>
          These are the cart actions you can do using useCart and the
          CartProvider
        </h2>
        <h3>Create a new cart</h3>
        <button
          onClick={() => {
            cartCreate({
              lines: [],
            });
          }}
        >
          Create cart
        </button>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Add to cart</h3>
          <label htmlFor="lineToAdd">Merchandise ID</label>
          <input
            type="text"
            value={lineToAdd}
            onChange={(e) => setLineToAdd(e.target.value)}
          />
          <button
            onClick={() => {
              linesAdd([
                {
                  merchandiseId: lineToAdd,
                  quantity: 1,
                },
              ]);
            }}
          >
            Add to cart
          </button>
        </div>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Remove cart line</h3>
          <label htmlFor="lineToRemove">CartLine Variant ID</label>
          <input
            type="text"
            value={lineToRemove}
            onChange={(e) => setLineToRemove(e.target.value)}
          />
          <button
            onClick={() => {
              linesRemove([lineToRemove]);
            }}
          >
            Remove cart line
          </button>
        </div>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Update cart line</h3>
          <label htmlFor="lineToUpdate">CartLine Variant ID</label>
          <input
            type="text"
            value={lineToUpdate}
            onChange={(e) => setLineToUpdate(e.target.value)}
          />
          <label htmlFor="lineToUpdateQuantity">Quantity</label>
          <input
            type="number"
            value={lineToUpdateQuantity}
            onChange={(e) => setLineToUpdateQuantity(Number(e.target.value))}
          />
          <button
            onClick={() => {
              linesUpdate([
                {
                  id: lineToUpdate,
                  quantity: lineToUpdateQuantity,
                },
              ]);
            }}
          >
            Update cart line
          </button>
        </div>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Note update</h3>
          <label htmlFor="noteUpdate">Note</label>
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={() => {
              noteUpdate(newNote);
            }}
          >
            Update note
          </button>
        </div>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Buyer identity update</h3>
          <label htmlFor="buyerIdentityUpdate">Buyer Identity</label>
          <input
            type="text"
            value={newBuyerIdentity}
            onChange={(e) => setBuyerIdentity(e.target.value)}
          />
          <button
            onClick={() => {
              buyerIdentityUpdate(
                JSON.parse(
                  `${newBuyerIdentity}`
                ) as unknown as CartBuyerIdentityInput
              );
            }}
          >
            update Buyer Identity
          </button>
        </div>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Update attributes</h3>
          <label htmlFor="cartAttributesUpdate">attributes</label>
          <input
            type="text"
            value={newCartAttributes}
            onChange={(e) => setCartAttributes(e.target.value)}
          />
          <button
            onClick={() => {
              cartAttributesUpdate(
                JSON.parse(
                  `${newCartAttributes}`
                ) as unknown as AttributeInput[]
              );
            }}
          >
            update cart attributes
          </button>
        </div>
        <div style={{display: 'grid', gap: 10}}>
          <h3>Update discount</h3>
          <label htmlFor="discountUpdate">discounts</label>
          <input
            type="text"
            value={newDiscount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <button
            onClick={() => {
              discountCodesUpdate(
                JSON.parse(`${newDiscount}`) as unknown as string[]
              );
            }}
          >
            update discounts
          </button>
        </div>
      </div>
    </>
  );
}

const config: ShopifyProviderProps = {
  storeDomain: 'hydrogen-preview.myshopify.com',
  storefrontToken: '3b580e70970c4528da70c98e097c2fa0',
  storefrontApiVersion: '2023-01',
  countryIsoCode: 'CA',
  languageIsoCode: 'EN',
};

const Template: Story<ComponentProps<typeof CartProvider>> = (props) => {
  return (
    <ShopifyProvider {...config}>
      <CartProvider {...props}>
        <CartComponent />
      </CartProvider>
    </ShopifyProvider>
  );
};

export const Default = Template.bind({});
Default.args = {
  /**  Maximum number of cart lines to fetch. Defaults to 250 cart lines. */
  numCartLines: 30,
  /** A callback that is invoked when the process to create a cart begins, but before the cart is created in the Storefront API. */
  data: undefined,
  /** A fragment used to query the Storefront API's [Cart object](https://shopify.dev/api/storefront/latest/objects/cart) for all queries and mutations. A default value is used if no argument is provided. */
  cartFragment: undefined,
  /** A customer access token that's accessible on the server if there's a customer login. */
  customerAccessToken: undefined,
  /** The ISO country code for i18n. */
  countryCode: 'DE',
};
