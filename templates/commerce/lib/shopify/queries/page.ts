import SEO_FRAGMENT from '../fragments/seo';

const PAGE_FRAGMENT = `#graphql
  fragment page on Page {
    ... on Page {
      id
      title
      handle
      body
      bodySummary
      seo {
        ...seo
      }
      createdAt
      updatedAt
    }
  }
  ${SEO_FRAGMENT}
` as const;

export const getPageQuery = `#graphql
  query getPage($handle: String!) {
    pageByHandle(handle: $handle) {
      ...page
    }
  }
  ${PAGE_FRAGMENT}
` as const;

export const getPagesQuery = `#graphql
  query getPages {
    pages(first: 100) {
      edges {
        node {
          ...page
        }
      }
    }
  }
  ${PAGE_FRAGMENT}
` as const;
