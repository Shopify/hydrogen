import type {HydrogenContext} from '@shopify/hydrogen';
import type {Params} from '@remix-run/react';

export * from '@remix-run/oxygen';
export {createRequestHandler} from './server';
export * from '@shopify/hydrogen';

export type LoaderArgs = {
  request: Request;
  params: Params;
  context: HydrogenContext;
};
