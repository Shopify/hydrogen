import {Await, useLoaderData} from '@remix-run/react';
import {type LoaderFunctionArgs, defer} from '@remix-run/server-runtime';
import {createStorefrontApiClient} from '@shopify/storefront-api-client';
import {type DocumentNode, parse} from 'graphql';
import {Suspense} from 'react';

export async function loader({context}: LoaderFunctionArgs) {
  const result = await deferQuery(context.env, query, {
    productId: 'gid://shopify/Product/6730850828344',
  });

  return defer(result);
}

export default function () {
  const {product, productRecommendations} = useLoaderData<typeof loader>();
  return (
    <>
      <h1>Product: {product.title}</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <Await
          errorElement="There was a problem loading related products"
          resolve={productRecommendations}
        >
          {(products) => (
            <h2>
              Related products:{' '}
              {products.map((product) => product.title).join(', ')}
            </h2>
          )}
        </Await>
      </Suspense>
    </>
  );
}

const query = `#graphql
query productA($productId: ID!) {
  product(id: $productId) {
    id
    title
  }
  ... relatedProducts @defer
}
fragment relatedProducts on QueryRoot {
  productRecommendations(productId: $productId) {
    id
    title
  }
}
`;

async function deferQuery(
  env: any,
  query: string,
  variables: Record<string, string> = {},
): Promise<any> {
  const parsed = parse(query);

  const {responsePromises, responseResolvers} =
    getDeferredQueryPromises(parsed);

  const client = createStorefrontApiClient({
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    apiVersion: 'unstable',
    publicAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  });

  const stream = await client.requestStream(query, {variables});

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      let initialResolution;
      for await (const chunk of stream) {
        if (!initialResolution) {
          initialResolution = {...chunk.data, ...responsePromises};
          resolve(initialResolution);
        }
        for (const key in responseResolvers) {
          if (chunk.data && key in chunk.data) {
            responseResolvers[key].resolved = true;
            responseResolvers[key].resolve(chunk.data[key]);
          }
        }
      }

      for (const key in responseResolvers) {
        if (!responseResolvers[key].resolved) {
          responseResolvers[key].reject(
            new Error('Deferred response not resolved'),
          );
        }
      }
    } catch (e) {
      reject(e);
    }
  });
}

function getDeferredQueryPromises(parsed: DocumentNode) {
  const responsePromises: Record<string, Promise<any>> = {};
  const responseResolvers: Record<
    string,
    {
      resolve: (resolve: any) => void;
      reject: (error: any) => void;
      resolved: boolean;
    }
  > = {};

  const operations = parsed.definitions.filter((definition) =>
    'kind' in definition ? definition?.kind === 'OperationDefinition' : false,
  );
  const fragments = parsed.definitions.filter((definition) =>
    'kind' in definition ? definition?.kind === 'FragmentDefinition' : false,
  );

  operations.forEach((operation) => {
    if ('selectionSet' in operation) {
      operation.selectionSet.selections.forEach((selection) => {
        if (
          selection.directives?.find(
            (directive) => directive.name.value === 'defer',
          ) &&
          'name' in selection
        ) {
          const matchingFragment = fragments.find((fragment) =>
            'name' in fragment
              ? fragment.name?.value === selection.name.value
              : false,
          );

          if (matchingFragment && 'selectionSet' in matchingFragment) {
            matchingFragment.selectionSet.selections.forEach(
              (fragmentSelection) => {
                if ('name' in fragmentSelection) {
                  responsePromises[fragmentSelection.name.value] = new Promise(
                    (resolve, reject) => {
                      responseResolvers[fragmentSelection.name.value] = {
                        resolved: false,
                        resolve,
                        reject,
                      };
                    },
                  );
                }
              },
            );
          }
        }
      });
    }
  });

  return {responsePromises, responseResolvers};
}
