import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
// 1. Import the Rick and Morty client.
import {createRickAndMortyClient} from '~/lib/createRickAndMortyClient.server';
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/

/**
 * The context implementation is separate from server.ts
 * so that type can be extracted for AppLoadContext
 * */

export type CustomAppLoadContext = Awaited<
  ReturnType<typeof createAppLoadContext>
>;

export async function createAppLoadContext(
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

  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: {language: 'EN', country: 'US'},
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });

  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  /**
   * 2. Create a Rick and Morty client.
   */
  const rickAndMorty = createRickAndMortyClient({
    cache,
    waitUntil,
    request,
  });
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/

  return {
    ...hydrogenContext,
    /***********************************************/
    /**********  EXAMPLE UPDATE STARTS  ************/
    rickAndMorty, // 3. Pass the Rick and Morty client to the action and loader context.
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
    // declare additional Remix loader context
  };
}
