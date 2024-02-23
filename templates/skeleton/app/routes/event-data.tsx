import {analyticsEventData} from '@shopify/hydrogen';
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  return analyticsEventData(request, storefront);
}

// no-op
export default function EventData() {
  return null;
}
