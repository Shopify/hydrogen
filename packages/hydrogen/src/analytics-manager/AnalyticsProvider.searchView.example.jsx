import {Analytics} from '@shopify/hydrogen';
import {useLoaderData} from 'react-router';

export async function loader({request}) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const searchTerm = String(searchParams.get('q') || '');

  return {searchTerm};
}

export default function SearchPage() {
  const {searchTerm} = useLoaderData();
  return (
    <div className="search">
      <h1>Search</h1>
      <Analytics.SearchView data={{searchTerm}} />
    </div>
  );
}
