import {createWithCache, CacheLong, type WithCache} from '@shopify/hydrogen';

type AllCacheOptions = Parameters<WithCache>[1];

export function createRickAndMortyClient({
  cache,
  waitUntil,
}: {
  cache: Cache;
  waitUntil: ExecutionContext['waitUntil'];
}) {
  const withCache = createWithCache({cache, waitUntil});

  async function query(
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
            query: query.replace('#graphql:rickAndMorty', ''),
            variables: options.variables,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Error fetching from rick and morty api: ${response.statusText}`,
          );
        }

        const json = (await response.json()) as unknown as {
          data: any;
          error: string;
        };

        return json.data;
      },
    );
  }

  return {query};
}
