import {UNSTABLE_Analytics} from '@shopify/hydrogen';
import {type LoaderFunctionArgs, json} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const searchTerm = String(searchParams.get('q') || '');

  return json({
    searchTerm,
  });
}

export default function SearchPage() {
  const {searchTerm} = useLoaderData<typeof loader>();
  return (
    <div className="search">
      <h1>Search</h1>
      <UNSTABLE_Analytics.SearchView data={{searchTerm}} />
    </div>
  );
}
