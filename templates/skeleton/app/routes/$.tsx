import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request, response}: LoaderFunctionArgs) {
  response!.status = 404;
  throw new Error(`${new URL(request.url).pathname} not found`);
}

export default function CatchAllPage() {
  return null;
}
