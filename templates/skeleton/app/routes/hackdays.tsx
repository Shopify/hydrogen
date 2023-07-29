import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import sections from '../../public/sections.jpg';

export async function loader({context}: LoaderArgs) {
  return json({});
}

export default function HackDays() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="hackdays">
      <h1>It&apos;s so empty in here...</h1>
      <a
        href="https://hydrogen-ui-e3f48eed66654f1e6bd3.o2.myshopify.dev"
        target="_blank"
        rel="noreferrer"
      >
        <img src={sections} alt="sections" width="800" />
      </a>
    </div>
  );
}
