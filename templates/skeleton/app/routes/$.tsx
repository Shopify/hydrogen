import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request, response}: LoaderFunctionArgs) {
  response!.body = `${new URL(request.url).pathname} not found`;
  response!.status = 404;
  throw response;
}

export default function CatchAllPage() {
  return null;
}
