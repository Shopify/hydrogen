import {LoaderFunctionArgs} from '@remix-run/server-runtime';

export async function action({params, context, request}: LoaderFunctionArgs) {
  const response = await fetch(
    `https://${context.env.PUBLIC_CHECKOUT_DOMAIN}/api/${params.version}/graphql.json?&fast_storefront_renderer=staging-east-2`,
    {
      method: 'POST',
      body: request.body,
      headers: request.headers,
    },
  );

  return new Response(response.body, {headers: new Headers(response.headers)});
}
