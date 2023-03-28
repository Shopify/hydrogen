import {useLoaderData} from '@remix-run/react';
import {LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({request, params, context}: LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  return {
    code,
  };
}

export default function Authorize() {
  const loaderData = useLoaderData<typeof loader>();

  return <p>Hello</p>;
}
