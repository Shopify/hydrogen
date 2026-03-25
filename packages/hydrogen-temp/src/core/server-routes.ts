import type {Storefront, I18nBase} from './storefront';
import {matchSfapiRoute} from './utils/request';

export type HydrogenServerRoutesOptions = {
  storefront: Storefront<I18nBase>;
  /** The path prefix where this handler is mounted (e.g. '/shopify', '/'). */
  basePath: string;
};

/**
 * Framework-agnostic request handler that provides Hydrogen server capabilities.
 * Returns `null` for unmatched routes, making it composable with any middleware chain.
 *
 * Phase 1: SFAPI proxy only. Cart, customer account, and analytics routes follow later.
 */
export async function hydrogenServerRoutes(
  request: Request,
  options: HydrogenServerRoutesOptions,
): Promise<Response | null> {
  const {storefront} = options;

  const sfapiMatch = matchSfapiRoute(request.url, options.basePath);
  if (!sfapiMatch) return null;

  const storefrontApiVersion = sfapiMatch[1];
  try {
    return await storefront.forward(request, {storefrontApiVersion});
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === 'TimeoutError';

    console.error(
      '[h2:error:sfapi-proxy]',
      isTimeout
        ? 'Storefront API request timed out'
        : 'Storefront API proxy error',
      error,
    );

    return new Response(isTimeout ? 'Gateway Timeout' : 'Bad Gateway', {
      status: isTimeout ? 504 : 502,
    });
  }
}
