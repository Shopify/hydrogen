import type {Collection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {Heading, LinkI18n} from '~/components';

export function CollectionCard({
  collection,
  loading,
}: {
  collection: Collection;
  loading?: HTMLImageElement['loading'];
}) {
  return (
    <LinkI18n to={`/collections/${collection.handle}`} className="grid gap-4">
      <div className="card-image bg-primary/5 aspect-[3/2]">
        {collection?.image && (
          <img
            alt={collection.title}
            src={collection.image.url}
            height={400}
            sizes="(max-width: 32em) 100vw, 33vw"
            width={600}
            loading={loading}
          />
        )}
      </div>
      <Heading as="h3" size="copy">
        {collection.title}
      </Heading>
    </LinkI18n>
  );
}
