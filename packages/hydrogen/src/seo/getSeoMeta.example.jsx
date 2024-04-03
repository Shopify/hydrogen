import {getSeoMeta} from '@shopify/hydrogen';

export async function loader({context}) {
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

export const meta = ({data, matches}) => {
  // Pass one or more arguments, preserving properties from parent routes
  return getSeoMeta(matches[0].data.seo, data.seo);
};
