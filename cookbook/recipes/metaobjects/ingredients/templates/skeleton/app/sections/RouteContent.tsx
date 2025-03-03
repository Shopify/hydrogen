import {SECTIONS_FRAGMENT, Sections} from '~/sections/Sections';
import {EditRoute} from '~/components/EditRoute';

import type {RouteContentQuery} from 'storefrontapi.generated';

export function RouteContent({route}: {route: RouteContentQuery['route']}) {
  return (
    <div>
      {route?.id && <EditRoute routeId={route.id} />}
      {route?.sections && <Sections sections={route.sections} />}
    </div>
  );
}

export const ROUTE_CONTENT_QUERY = `#graphql
  query RouteContent($handle: String!) {
    route: metaobject(handle: {type: "route", handle: $handle}) {
      type
      id
      title: field(key: "title") {
        key
        value
      }
      sections: field(key: "sections") {
        ...Sections
      }
    }
  }
  ${SECTIONS_FRAGMENT}
`;
