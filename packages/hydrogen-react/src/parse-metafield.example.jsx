import {parseMetafield} from '@shopify/hydrogen-react';

export function DateMetafield({metafield}) {
  const parsedMetafield = parseMetafield(metafield);

  return <div>Date: {parsedMetafield.parsedValue?.toDateString()}</div>;
}

export function VariantReferenceMetafield({metafield}) {
  const parsedMetafield = parseMetafield(metafield);

  return <div>Variant title: {parsedMetafield.parsedValue?.title}</div>;
}

export function ListCollectionReferenceMetafield({metafield}) {
  const parsedMetafield = parseMetafield(metafield);

  return (
    <div>
      The first collection title: {parsedMetafield.parsedValue?.[0].title}
    </div>
  );
}
