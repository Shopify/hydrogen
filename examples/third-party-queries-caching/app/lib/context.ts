import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import {createRickAndMortyClient} from '~/lib/createRickAndMortyClient.server';

/**
 * Creates Hydrogen context for React Router 7.8.x with Rick and Morty client
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  /**
   * Create a Rick and Morty client for third-party GraphQL queries
   */
  const rickAndMorty = createRickAndMortyClient({
    cache,
    waitUntil,
    request,
  });

  // Define the additional context object
  const additionalContext = {
    // Pass the Rick and Morty client to the action and loader context
    rickAndMorty,
  } as const;

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}

// Augment HydrogenAdditionalContext with our custom Rick and Morty client
type AdditionalContextType = {
  rickAndMorty: ReturnType<typeof createRickAndMortyClient>;
};

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}