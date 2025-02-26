import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';

// @description Add metaobject content imports
import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({context, params}: LoaderFunctionArgs) {
  const {storefront} = context;
  const {name} = params;
  // @description Query for the route's content metaobject
  const {route} = await storefront.query(ROUTE_CONTENT_QUERY, {
    variables: {handle: `route-${name}`},
  });

  return {route};
}

export default function Store() {
  const {route} = useLoaderData<typeof loader>();
  return (
    <div className="store">
      {/* @description Render the route's content sections */}
      <RouteContent route={route} />
    </div>
  );
}
