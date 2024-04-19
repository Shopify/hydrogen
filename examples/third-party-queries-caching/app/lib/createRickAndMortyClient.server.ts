import {createWithCache, CacheLong, type WithCache} from '@shopify/hydrogen';

type AllCacheOptions = Parameters<WithCache>[1];

export function createRickAndMortyClient({
  cache,
  waitUntil,
  request,
}: {
  cache: Cache;
  waitUntil: ExecutionContext['waitUntil'];
  request: Request;
}) {
  const withCache = createWithCache({cache, waitUntil, request});

  async function query<T = any>(
    query: `#graphql:rickAndMorty${string}`,
    options: {
      variables?: object;
      cache: AllCacheOptions;
    } = {variables: {}, cache: CacheLong()},
  ) {
    return withCache(
      ['r&m', query, JSON.stringify(options.variables)],
      options.cache,
      async function () {
        // call to the API
        const response = await fetch('https://rickandmortyapi.com/graphql', {
          method: 'POST',
          headers: {
            'Content-type': 'application/json',
          },
          body: JSON.stringify({
            query: minifyQuery(query),
            variables: options.variables,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Error fetching from rick and morty api: ${response.statusText}`,
          );
        }

        const json = await response.json<{data: T; error: string}>();

        return json.data;
      },
    );
  }

  return {query};
}

function minifyQuery<T extends string>(string: T) {
  return string
    .replace(/\s*#.*$/gm, '') // Remove GQL comments
    .replace(/\s+/gm, ' ') // Minify spaces
    .trim() as T;
}
