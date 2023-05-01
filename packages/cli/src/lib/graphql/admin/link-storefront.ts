export const LinkStorefrontQuery = `#graphql
  query LinkStorefront {
    hydrogenStorefronts {
      id
      title
      productionUrl
    }
  }
`;

interface HydrogenStorefront {
  id: string;
  title: string;
  productionUrl: string;
}

export interface LinkStorefrontSchema {
  hydrogenStorefronts: HydrogenStorefront[];
}
