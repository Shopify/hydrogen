import {
  createWithCache,
  CacheLong,
  type CachingStrategy,
} from '@shopify/hydrogen';

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

  return {
    async query<T = any>(
      query: `#graphql:rickAndMorty${string}`,
      options: {
        variables?: object;
        cache?: CachingStrategy;
      },
    ) {
      query = minifyQuery(query);
      const body = JSON.stringify({query, variables: options.variables});

      const {data, response} = await withCache.fetch<{data: T; error: string}>(
        'https://rickandmortyapi.com/graphql',
        {
          method: 'POST',
          headers: {'Content-type': 'application/json'},
          body,
        },
        {
          cache: options.cache ?? CacheLong(),
          shouldCacheResponse: (body) => !body?.error,
          cacheKey: ['r&m', body],
          displayName:
            'Rick & Morty - ' + query.match(/^(query|mutation)\s\w+/)?.[0],
        },
      );

      if (!response.ok || !data || data?.error) {
        throw new Error(
          data?.error ??
            `Error fetching from rick and morty api: ${response.statusText}`,
        );
      }

      return data.data;
    },
  };
}

function minifyQuery<T extends string>(string: T) {
  return string
    .replace(/\s*#.*$/gm, '') // Remove GQL comments
    .replace(/\s+/gm, ' ') // Minify spaces
    .trim() as T;
}
