import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';

export async function loader({params, context}: LoaderArgs) {
  return json({});
}

export default function Page() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="page">
      <h1>Soo empty</h1>
    </div>
  );
}
