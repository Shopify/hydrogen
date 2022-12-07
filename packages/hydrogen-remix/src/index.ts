import type {StorefrontClient} from '@shopify/h2-test-hydrogen';
import type {AppData, DataFunctionArgs} from '@remix-run/server-runtime';
import type {Params} from '@remix-run/react';

export * from '@shopify/h2-test-hydrogen';

export {RESOURCE_TYPES, REQUIRED_RESOURCES} from './routing/types';
export {notFoundMaybeRedirect} from './routing/redirect';
export {proxyLiquidRoute} from './routing/proxy';

export type HydrogenContext = StorefrontClient & {
  [key: string]: unknown;
};

export type LoaderArgs = DataFunctionArgs & {
  request: Request;
  params: Params;
  context: HydrogenContext;
};

export interface LoaderFunction {
  (args: LoaderArgs): Promise<Response> | Response | Promise<AppData> | AppData;
}

export type ActionArgs = DataFunctionArgs & {
  context: HydrogenContext;
};

export interface ActionFunction {
  (args: ActionArgs): Promise<Response> | Response | Promise<AppData> | AppData;
}
