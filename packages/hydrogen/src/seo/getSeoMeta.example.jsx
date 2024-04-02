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

export const meta = ({data}) => {
  return getSeoMeta(
    data.seo,
    // these override meta
    () => {
      return [{title: 'Custom title'}];
    },

    // these append meta
    () => {
      return [{name: 'author', content: 'Hydrogen'}];
    },
  );
};
