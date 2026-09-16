import {describe, it, expectTypeOf} from 'vitest';
import type {Cart} from '@shopify/hydrogen-react/storefront-api-types';
import type {HydrogenCart} from './createCartHandler';
import type {CartReturn, CartQueryDataReturn} from './queries/cart-types';

declare global {
  interface HydrogenCustomCartFragment {
    giftMessage?: {key: string; value: string} | null;
  }
}

describe('HydrogenCustomCartFragment global augmentation', () => {
  it('default HydrogenCart picks up augmented fields on get()', () => {
    type DefaultCart = HydrogenCart;
    type GetResult = Awaited<ReturnType<DefaultCart['get']>>;

    expectTypeOf<NonNullable<GetResult>>().toHaveProperty('giftMessage');
    expectTypeOf<NonNullable<GetResult>>().toHaveProperty('id');
    expectTypeOf<NonNullable<GetResult>>().toHaveProperty('checkoutUrl');
  });

  it('default HydrogenCart picks up augmented fields on create()', () => {
    type DefaultCart = HydrogenCart;
    type CreateResult = Awaited<ReturnType<DefaultCart['create']>>;

    expectTypeOf<CreateResult['cart']>().toHaveProperty('giftMessage');
    expectTypeOf<CreateResult['cart']>().toHaveProperty('id');
  });

  it('default HydrogenCart picks up augmented fields on addLines()', () => {
    type DefaultCart = HydrogenCart;
    type AddLinesResult = Awaited<ReturnType<DefaultCart['addLines']>>;

    expectTypeOf<AddLinesResult['cart']>().toHaveProperty('giftMessage');
    expectTypeOf<AddLinesResult['cart']>().toHaveProperty('id');
  });

  it('augmented fields coexist with standard Cart fields', () => {
    type DefaultCart = HydrogenCart;
    type GetResult = NonNullable<Awaited<ReturnType<DefaultCart['get']>>>;

    expectTypeOf<GetResult>().toMatchTypeOf<
      Cart & {giftMessage?: {key: string; value: string} | null}
    >();
  });
});
