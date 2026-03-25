/**
 * @deprecated Use `createRequestHandler` and `getStorefrontHeaders`
 * from `@shopify/hydrogen/oxygen` instead.
 */
export {createRequestHandler, getStorefrontHeaders} from './server';

/** @deprecated Import these types directly from `react-router` instead. */
export type {
  ActionFunction,
  ActionFunctionArgs,
  AppLoadContext,
  Cookie,
  CookieOptions,
  CookieParseOptions,
  CookieSerializeOptions,
  CookieSignatureOptions,
  EntryContext,
  ErrorResponse,
  HandleDataRequestFunction,
  HandleDocumentRequestFunction,
  HandleErrorFunction,
  HeadersArgs,
  HeadersFunction,
  HtmlLinkDescriptor,
  LinkDescriptor,
  LinksFunction,
  LoaderFunction,
  LoaderFunctionArgs,
  MetaArgs,
  MetaDescriptor,
  MetaFunction,
  PageLinkDescriptor,
  RequestHandler,
  ServerBuild,
  ServerEntryModule,
  Session,
  SessionData,
  SessionIdStorageStrategy,
  SessionStorage,
} from 'react-router';

/** @deprecated Import these functions directly from `react-router` instead. */
export {
  createCookie,
  createCookieSessionStorage,
  createMemorySessionStorage,
  createSession,
  createSessionStorage,
  data,
  isCookie,
  isSession,
  redirect,
  redirectDocument,
} from 'react-router';
