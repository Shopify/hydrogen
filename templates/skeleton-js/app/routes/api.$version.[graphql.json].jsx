/**
 * @param {LoaderFunctionArgs}
 */
export async function action({params, context, request}) {
  const response = await fetch(
    `https://${context.env.PUBLIC_CHECKOUT_DOMAIN}/api/${params.version}/graphql.json`,
    {
      method: 'POST',
      body: request.body,
      headers: request.headers,
    },
  );

  return new Response(response.body, {headers: new Headers(response.headers)});
}

/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
