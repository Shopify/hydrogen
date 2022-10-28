import type {HydrogenContext} from './storefront';
import type {Params} from '@remix-run/react';

export * from '@remix-run/oxygen';
export {createRequestHandler} from './server';
export * from './storefront';
export {fetchWithServerCache} from './cache/fetch';
export {
  CacheNone,
  CacheShort,
  CacheLong,
  CacheCustom,
} from './cache/strategies';

export type LoaderArgs = {
  request: Request;
  params: Params;
  context: HydrogenContext;
};
