import {useLoaderData} from '@remix-run/react';
import {json} from '@shopify/remix-oxygen';
import {UNSTABLE_Analytics} from '@shopify/hydrogen';

export async function loader() {
  return json({
    collection: {
      id: '123',
      title: 'ABC',
      handle: 'abc',
    },
  });
}

export default function Collection() {
  const {collection} = useLoaderData();
  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <UNSTABLE_Analytics.CollectionView
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
