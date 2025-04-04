import { useLoaderData } from 'react-router';
import {Analytics} from '@shopify/hydrogen';

export async function loader() {
  return {
    collection: {
      id: '123',
      title: 'ABC',
      handle: 'abc',
    },
  };
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();
  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}
