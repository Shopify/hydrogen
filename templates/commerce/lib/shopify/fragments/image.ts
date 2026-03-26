const IMAGE_FRAGMENT = `#graphql
  fragment image on Image {
    url
    altText
    width
    height
  }
` as const;

export default IMAGE_FRAGMENT;
