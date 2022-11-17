import type {HydrogenContext} from '@shopify/hydrogen';
import type {AppData, DataFunctionArgs} from '@remix-run/oxygen';

export * from '@remix-run/oxygen';
export {createRequestHandler} from './server';
export * from '@shopify/hydrogen';

export type LoaderArgs = DataFunctionArgs & {
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
