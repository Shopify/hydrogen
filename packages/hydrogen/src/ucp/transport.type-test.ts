import {expectTypeOf, it} from 'vitest';
import type {CartTransport} from '../core/cart/cart';
import {createUcpCartTransport} from './transport';
it('satisfies CartTransport', () => {
  expectTypeOf<ReturnType<typeof createUcpCartTransport>>().toMatchTypeOf<CartTransport>();
});
