import {MetaFunction} from 'react-router';
import {LoaderFunctionArgs} from 'react-router';
import {getSeoMeta} from '@shopify/hydrogen';

export async function loader({context}: LoaderFunctionArgs) {
  const {shop} = await context.storefront.query(`
    query layout {
      shop {
        name
        description
      }
    }
  `);

  return {
    seo: {
      title: shop.title,
      description: shop.description,
    },
  };
}

export const meta: MetaFunction<typeof loader> = ({data, matches}) => {
  // Pass one or more arguments, preserving properties from parent routes
  return getSeoMeta((matches as any)[0].data.seo, data!.seo);
};
