import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import sections from '../../public/sections.jpg';

export async function loader({params, context}: LoaderArgs) {
  return json({});
}

export default function Page() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="page">
      <h1>Hackdays</h1>
      <img src={sections} alt="sections" width="800" />
    </div>
  );
}
