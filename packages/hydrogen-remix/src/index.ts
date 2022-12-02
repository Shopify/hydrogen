import type {HydrogenContext} from '@shopify/h2-test-hydrogen';
import type {AppData, DataFunctionArgs} from '@shopify/h2-test-remix-oxygen';
import type {Params} from '@remix-run/react';

export * from '@shopify/h2-test-remix-oxygen';
export {createRequestHandler} from './server';
export * from '@shopify/h2-test-hydrogen';

export {RESOURCE_TYPES, REQUIRED_RESOURCES} from './routing/types';
export {notFoundMaybeRedirect} from './routing/redirect';
export {proxyLiquidRoute} from './routing/proxy';

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
