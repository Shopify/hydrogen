import {MetaFunction} from '@remix-run/react';
import {LoaderFunctionArgs} from '@remix-run/server-runtime';
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

// Instead of rendering the `<Seo />` component in root.tsx
// call `getSeoMeta` from within meta in each route that has
// an `seo` prop returned from the loader.
export const meta: MetaFunction<typeof loader> = ({data}) => {
  return getSeoMeta(data!.seo);
};
