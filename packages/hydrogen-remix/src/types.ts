/**
 * TODO: Remove this file after packaged routes are removed or refactored to accept an argument
 * which injects the StorefrontClient, session, etc.
 */

import type {StorefrontClient} from '@shopify/h2-test-hydrogen';
import type {Params} from '@remix-run/react';
import type {
  AppData,
  AppLoadContext as RemixAppLoadContext,
  DataFunctionArgs,
} from '@remix-run/server-runtime';

export interface AppLoadContext extends RemixAppLoadContext, StorefrontClient {}

export interface LoaderArgs extends DataFunctionArgs {
  request: Request;
  params: Params;
  context: AppLoadContext;
}

export interface LoaderFunction {
  (args: LoaderArgs): Promise<Response> | Response | Promise<AppData> | AppData;
}

export interface ActionArgs extends DataFunctionArgs {
  context: AppLoadContext;
}

export interface ActionFunction {
  (args: ActionArgs): Promise<Response> | Response | Promise<AppData> | AppData;
}
