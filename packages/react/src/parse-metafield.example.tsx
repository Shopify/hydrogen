import {
  parseMetafield,
  type ParsedMetafields,
} from '@shopify/storefront-kit-react';
import type {Metafield} from '@shopify/storefront-kit-react/storefront-api-types';

export function DateMetafield({metafield}: {metafield: Metafield}) {
  const parsedMetafield = parseMetafield<ParsedMetafields['date']>(metafield);

  return <div>Date: {parsedMetafield.parsedValue?.toDateString()}</div>;
}

export function VariantReferenceMetafield({metafield}: {metafield: Metafield}) {
  const parsedMetafield =
    parseMetafield<ParsedMetafields['variant_reference']>(metafield);

  return <div>Variant title: {parsedMetafield.parsedValue?.title}</div>;
}

export function ListCollectionReferenceMetafield({
  metafield,
}: {
  metafield: Metafield;
}) {
  const parsedMetafield =
    parseMetafield<ParsedMetafields['list.collection_reference']>(metafield);

  return (
    <div>
      The first collection title: {parsedMetafield.parsedValue?.[0].title}
    </div>
  );
}
