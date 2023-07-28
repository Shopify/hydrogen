// import type {V2_MetaFunction} from '@shopify/remix-oxygen';
// import {json, type LoaderArgs} from '@shopify/remix-oxygen';
// import {useLoaderData} from '@remix-run/react';
// import {Sections, type RouteSections} from '../sections/Sections';
// import {KITCHEN_SINK_QUERY} from '../sections/KitchenSink.schema';

// export const meta: V2_MetaFunction = () => {
//   return [{title: 'Hydrogen | Home'}];
// };

// export async function loader({context}: LoaderArgs) {
//   const {section} = await context.storefront.query(KITCHEN_SINK_QUERY, {
//     variables: {
//       handle: 'section-kitchen-sink-default',
//     },
//   });

//   const sections = [section] as RouteSections;

//   return json({sections});
// }

// export default function KitchenSink() {
//   const {sections} = useLoaderData<typeof loader>();
//   return (
//     <>
//       <div className="home">
//         <Sections sections={sections} />
//       </div>
//     </>
//   );
// }
