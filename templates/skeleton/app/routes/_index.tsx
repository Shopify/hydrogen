import type {V2_MetaFunction} from '@shopify/remix-oxygen';
import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
// import {Sections, type RouteSections} from '../sections/Sections';
// import {IMAGE_TEXT_QUERY} from '../sections/ImageText.schema';

export const meta: V2_MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({context}: LoaderArgs) {
  // const {section} = await context.storefront.query(IMAGE_TEXT_QUERY, {
  //   variables: {
  //     handle: 'section-image-text-example',
  //   },
  // });

  // const sections = [section] as RouteSections;
  return json({sections: []});
}

export default function Homepage() {
  const {sections} = useLoaderData<typeof loader>();
  return (
    <>
      <div className="home">{/* <Sections sections={sections} /> */}</div>
    </>
  );
}
