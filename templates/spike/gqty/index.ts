/**
 * GQty: You can safely modify this file based on your needs.
 */

import {
  Cache,
  createClient,
  defaultResponseHandler,
  type QueryFetcher,
} from 'gqty';
import {
  generatedSchema,
  scalarsEnumsHash,
  type GeneratedSchema,
} from './schema.generated';

const queryFetcher: QueryFetcher = async function (
  {query, variables, operationName},
  fetchOptions,
) {
  // Modify "https://mock.shop/api" if needed
  const response = await fetch('https://mock.shop/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
      operationName,
    }),
    mode: 'cors',
    ...fetchOptions,
  });

  return await defaultResponseHandler(response);
};

const cache = new Cache(
  undefined,
  /**
   * Default option is immediate cache expiry but keep it for 5 minutes,
   * allowing soft refetches in background.
   */
  {
    maxAge: 0,
    staleWhileRevalidate: 5 * 60 * 1000,
    normalization: true,
  },
);

export const client = createClient<GeneratedSchema>({
  schema: generatedSchema,
  scalars: scalarsEnumsHash,
  cache,
  fetchOptions: {
    fetcher: queryFetcher,
  },
});

// Core functions
export const {resolve, subscribe, schema} = client;

// Legacy functions
export const {query, mutation, mutate, subscription, resolved, refetch, track} =
  client;

export * from './schema.generated';
