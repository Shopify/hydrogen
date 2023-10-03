import {LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({request}: LoaderArgs) {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  request.does.not.exist;
}
