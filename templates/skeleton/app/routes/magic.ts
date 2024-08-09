import {json} from '@shopify/remix-oxygen';

export async function loader() {
  return json({
    test: 'magic route overwrite',
  });
}
