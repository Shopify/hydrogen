import {Unstable__Analytics} from '@shopify/hydrogen';

export default function SearchPage() {
  const {searchTerm} = useLoaderData();
  return (
    <div className="search">
      <h1>Search</h1>
      <Unstable__Analytics.SearchView data={{searchTerm}} />
    </div>
  );
}
