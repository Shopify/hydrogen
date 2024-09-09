import {json, MetaArgs, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';
import {getSeoMeta} from '@shopify/hydrogen';
import {seoPayload} from '~/lib/seo';

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/

// 1. Add metaobject content imports
import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';

export const meta = ({matches}: MetaArgs<typeof loader>) => {
  return getSeoMeta(...matches.map((match) => (match.data as any)?.seo));
};

export async function loader({context, request}: LoaderFunctionArgs) {
  const {storefront} = context;

  // 2. Query the home route metaobject
  const {route} = await storefront.query(ROUTE_CONTENT_QUERY, {
    variables: {handle: 'route-home'},
    cache: storefront.CacheNone(),
  });

  const seo = seoPayload.home({url: request.url});

  return json({route, seo});
}

export default function Homepage() {
  const {route} = useLoaderData<typeof loader>();

  return (
    <div className="home">
      {/* 3. Render the route's content sections */}
      <RouteContent route={route} />
    </div>
  );
}

/**********   EXAMPLE UPDATE END   ************/
/***********************************************/
