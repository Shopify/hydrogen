import type {LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params}: LoaderArgs) {
  throw new Error(`Page ${params} not found`);
}
