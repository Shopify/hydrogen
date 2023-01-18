import {vi} from 'vitest';
import {render} from '@testing-library/react';
import {ShopifyProvider} from './ShopifyProvider.js';
import {
  ShopPayButton,
  DoublePropsErrorMessage,
  MissingPropsErrorMessage,
  InvalidPropsErrorMessage,
} from './ShopPayButton.js';
import {getShopifyConfig} from './ShopifyProvider.test.js';

vi.mock('./load-script.js', () => {
  return {
    useLoadScript: () => 'done',
  };
});

describe(`<ShopPayButton />`, () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it(`throws an error if you don't pass either variantIds or variantIdsAndQuantities`, () => {
    expect(() =>
      // @ts-expect-error Purposely not passing the correct props
      render(<ShopPayButton />, {
        wrapper: ({children}) => (
          <ShopifyProvider shopifyConfig={getShopifyConfig()}>
            {children}
          </ShopifyProvider>
        ),
      })
    ).toThrow(MissingPropsErrorMessage);
  });

  it(`throws an error if you pass both variantIds and variantIdsAndQuantities`, () => {
    expect(() =>
      // @ts-expect-error Purposely passing in both props when they shouyldn't be
      render(<ShopPayButton variantIds={[]} variantIdsAndQuantities={[]} />, {
        wrapper: ({children}) => (
          <ShopifyProvider shopifyConfig={getShopifyConfig()}>
            {children}
          </ShopifyProvider>
        ),
      })
    ).toThrow(DoublePropsErrorMessage);
  });

  it(`creates the correct attribute when using 'variantIds'`, () => {
    const fakeId = 'gid://shopify/ProductVariant/123';
    const {container} = render(<ShopPayButton variantIds={[fakeId]} />, {
      wrapper: ({children}) => (
        <ShopifyProvider shopifyConfig={getShopifyConfig()}>
          {children}
        </ShopifyProvider>
      ),
    });

    const button = container.querySelector('shop-pay-button');

    expect(button).toHaveAttribute(
      'store-url',
      'https://notashop.myshopify.io'
    );
    expect(button).toHaveAttribute('variants', '123');
  });

  it(`creates the correct attribute when using 'variantIdsAndQuantities'`, () => {
    const fakeId = 'gid://shopify/ProductVariant/123';
    const fakeQuantity = 2;
    const {container} = render(
      <ShopPayButton
        variantIdsAndQuantities={[{id: fakeId, quantity: fakeQuantity}]}
      />,
      {
        wrapper: ({children}) => (
          <ShopifyProvider shopifyConfig={getShopifyConfig()}>
            {children}
          </ShopifyProvider>
        ),
      }
    );

    const button = container.querySelector('shop-pay-button');

    expect(button).toHaveAttribute(
      'store-url',
      'https://notashop.myshopify.io'
    );
    expect(button).toHaveAttribute('variants', '123:2');
  });

  it(`applies the css variable if 'width' exists`, () => {
    const {container} = render(
      <ShopPayButton
        width="100%"
        variantIdsAndQuantities={[
          {id: 'gid://shopify/ProductVariant/123', quantity: 2},
        ]}
      />,
      {
        wrapper: ({children}) => (
          <ShopifyProvider shopifyConfig={getShopifyConfig()}>
            {children}
          </ShopifyProvider>
        ),
      }
    );

    expect(container.querySelector('div')).toHaveAttribute(
      'style',
      '--shop-pay-button-width: 100%;'
    );
  });

  it(`throws error if invalid 'variantIds' is supplied`, () => {
    const fakeId = '123';
    expect(() =>
      render(<ShopPayButton variantIds={[fakeId]} />, {
        wrapper: ({children}) => (
          <ShopifyProvider shopifyConfig={getShopifyConfig()}>
            {children}
          </ShopifyProvider>
        ),
      })
    ).toThrow(InvalidPropsErrorMessage);
  });
});
