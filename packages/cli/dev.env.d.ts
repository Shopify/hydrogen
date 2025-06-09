/**
 * This file is used to provide types for generator utilities.
 */

import type {HydrogenContext, HydrogenSession} from '@shopify/hydrogen';
import type {
  LanguageCode,
  CountryCode,
} from '@shopify/hydrogen/storefront-api-types';

declare module 'react-router' {
  /**
   * Declare local additions to the Remix loader context.
   */
  export interface AppLoadContext
    extends HydrogenContext<HydrogenSession, undefined, I18nLocale> {}

  // TODO: remove this once we've migrated to `Route.LoaderArgs` instead for our loaders
  interface LoaderFunctionArgs {
    context: AppLoadContext;
  }

  // TODO: remove this once we've migrated to `Route.ActionArgs` instead for our actions
  interface ActionFunctionArgs {
    context: AppLoadContext;
  }
}

declare global {
  /**
   * The I18nLocale used for Storefront API query context.
   * Also used for the generated i18n functions.
   */
  type I18nLocale = {
    language: LanguageCode;
    country: CountryCode;
    pathPrefix?: string;
  };

  /**
   * This type is used to import types from mini-oxygen
   */
  type ExecutionContext = {
    waitUntil: (promise: Promise<unknown>) => void;
  };

  /**
   * This type is used to import types from mini-oxygen
   */
  type ExportedHandlerFetchHandler = Function;
}
