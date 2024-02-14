import type {ActionFunctionArgs, LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request}: LoaderFunctionArgs) {
  throw new Response(`${new URL(request.url).pathname} not found`, {
    status: 404,
  });
}

export async function action({request}: ActionFunctionArgs) {
  const {pathname} = new URL(request.url);

  if (pathname === '/.well-known/shopify/monorail/unstable/produce_batch') {
    return new Response(null, {status: 200});
  }

  throw new Response(`${new URL(request.url).pathname} not found`, {
    status: 404,
  });
}
