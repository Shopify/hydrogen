import type {HydrogenContext} from './storefront';
import type {Params} from '@remix-run/react';

export * from '@remix-run/oxygen';
export {createRequestHandler} from './server';
export * from './storefront';

export type LoaderArgs = {
  request: Request;
  params: Params;
  context: HydrogenContext;
};
