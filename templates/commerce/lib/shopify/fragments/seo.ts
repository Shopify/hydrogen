const SEO_FRAGMENT = `#graphql
  fragment seo on SEO {
    description
    title
  }
` as const;

export default SEO_FRAGMENT;
