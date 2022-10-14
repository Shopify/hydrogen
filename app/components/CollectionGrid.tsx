import type {
  Collection,
  CollectionConnection,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {useState} from 'react';
import {LinkI18n} from '~/components';
import {CollectionCard} from '~/components/CollectionCard';
import {MoreGridItems} from '~/components/MoreGridItems';
import {Grid} from '~/components/Grid';
import {getImageLoadingPriority} from '~/lib/const';
import clsx from 'clsx';

export function CollectionGrid({
  collections: initialCollections,
  ...props
}: {
  collections: CollectionConnection;
  [key: string]: any;
}) {
  const [collections, setProducts] = useState<
    CollectionConnection['nodes'] | []
  >(initialCollections?.nodes || []);
  const [hasNextPage, setHasNextPage] = useState<boolean>(
    initialCollections?.pageInfo?.hasNextPage || false
  );
  const [cursor, setCursor] = useState<string | null>(
    initialCollections?.pageInfo?.endCursor || null
  );

  if (!collections?.length) {
    return (
      <>
        <p>No collections found</p>
        <LinkI18n to="/products">
          <p className="underline">Browse catalog</p>
        </LinkI18n>
      </>
    );
  }

  return (
    <>
      <Grid items={collections.length === 3 ? 3 : 2}>
        {collections.map((collection, i) => (
          <CollectionCard
            collection={collection as Collection}
            key={collection.id}
            loading={getImageLoadingPriority(i, 2)}
          />
        ))}
      </Grid>

      {/* Load additional collections on scroll */}
      {hasNextPage && cursor && (
        <MoreGridItems
          {...props}
          cursor={cursor}
          key={cursor}
          className={clsx(
            'grid-cols-1',
            'md:grid-cols-2',
            'grid gap-2 gap-y-6 md:gap-4 lg:gap-6',
            'grid-flow-row'
          )}
          pageBy={2}
          placeholderItem={
            <div className="h-[310px] sm:h-[480px] md:h-[315px] lg:h-[386px] xl:h-[348px] 2xl:h-[560px] bg-gray-100"></div>
          }
          setCursor={setCursor}
          setHasNextPage={setHasNextPage}
          setItems={setProducts}
        />
      )}
    </>
  );
}
