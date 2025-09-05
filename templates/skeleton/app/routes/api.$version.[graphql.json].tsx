import type {Route} from './+types/api.$version.[graphql.json]';

export async function action({params, context, request}: Route.ActionArgs) {
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
