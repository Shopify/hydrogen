import type {V2_MetaFunction} from '@shopify/remix-oxygen';
import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {ImageText} from '../sections/ImageText';
import {IMAGE_TEXT_QUERY} from '../sections/ImageText.schema';

export const meta: V2_MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({context}: LoaderArgs) {
  // For now we query for an individual section. In the future we'll want to
  // query for all sections on the page via a route metaobject query that holds
  // an array of sections for a given route
  const {section} = await context.storefront.query(IMAGE_TEXT_QUERY, {
    variables: {
      handle: 'section-image-text-default',
    },
  });

  return json({
    imageText: section,
  });
}

export default function Homepage() {
  const {imageText} = useLoaderData<typeof loader>();
  return (
    <div className="home">{imageText && <ImageText {...imageText} />}</div>
  );
}
