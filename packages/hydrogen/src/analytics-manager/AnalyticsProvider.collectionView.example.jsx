import {UNSTABLE_Analytics} from '@shopify/hydrogen';

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
