import {HydrogenContext} from './storefront';
import {Params, Request} from '@remix-run/oxygen';

export * from '@remix-run/oxygen';
export {createRequestHandler} from './server';
export * from './storefront';

export type LoaderArgs = {
  request: Request;
  params: Params;
  context: HydrogenContext;
};
