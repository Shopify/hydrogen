import {
  generateImageWidths,
  generateSizes,
  generateSrcSet,
  shopifyLoader,
} from '@shopify/hydrogen';

type GenerateImageWidthsParams = Parameters<typeof generateImageWidths>;
type GenerateSizesParams = Parameters<typeof generateSizes>;

type GenPreloadImageLinkMetaProps = {
  /* The URL of the image to generate the srcset for */
  url: string;
  /* The width of the image to generate the srcset for */
  width?: GenerateImageWidthsParams[0];
  // The step parameters to use for generating the image widths array
  srcSet?: {
    interval: GenerateImageWidthsParams[1];
    startingWidth: GenerateImageWidthsParams[2];
    incrementSize: GenerateImageWidthsParams[3];
  };
  // The aspect ratio and crop to use for the image sizes
  sizes?: {
    aspectRatio: GenerateSizesParams[1];
    crop: GenerateSizesParams[2];
  };
  /** An optional loader function to use for generating the image URLs based on a given CDN */
  loader?: typeof shopifyLoader;
};

const defaultProps = {
  url: '',
  width: '100%',
  srcSet: {interval: 15, startingWidth: 200, incrementSize: 200},
  sizes: {aspectRatio: '1/1', crop: 'center'},
  loader: shopifyLoader,
} as const;

/**
 * Generates a link meta tag for preloading an image with a srcset
 * @param {GenPreloadImageLinkMetaProps} props - The props to generate the preload link meta tag
 * @returns {object} - The link meta tag object
 * @example
 * Basic usage with default <Image /> component props:
 * ```
 * const heroImageLink = genPreloadImageLinkMeta({
 *  url: 'https://cdn.shopify.com/s/files/1/0000/0000/0000/files/hero.jpg',
 * });
 * ```
 *
 * @example
 * Usage with custom `width` set in the <Image /> component props:
 * ```
 * const heroImageLink = genPreloadImageLinkMeta({
 *  url: 'https://cdn.shopify.com/s/files/1/0000/0000/0000/files/hero.jpg',
 *  width: '(min-width: 45em) 50vw, 100vw',
 * });
 * ```
 */
export function genPreloadImageLinkMeta({
  url,
  width = defaultProps.width,
  srcSet = defaultProps.srcSet,
  sizes = defaultProps.sizes,
  loader = shopifyLoader,
}: GenPreloadImageLinkMetaProps) {
  // Assign default values if not provided
  const interval = srcSet?.interval ?? defaultProps?.srcSet?.interval ?? 15;
  const startingWidth =
    srcSet?.startingWidth ?? defaultProps.srcSet.startingWidth ?? 200;
  const incrementSize =
    srcSet?.incrementSize ?? defaultProps.srcSet.incrementSize ?? 200;
  const aspectRatio =
    sizes?.aspectRatio ?? defaultProps.sizes.aspectRatio ?? '1/1';
  const crop = sizes?.crop ?? defaultProps.sizes.crop ?? 'center';
  const activeLoader = loader ?? defaultProps.loader;

  const widths = generateImageWidths(
    width,
    interval,
    startingWidth,
    incrementSize,
  );
  const imagesizes = generateSizes(widths, aspectRatio, crop);
  const imagesrcset = generateSrcSet(url, imagesizes, activeLoader);

  return {
    as: 'image',
    href: url,
    imagesrcset,
    rel: 'preload',
    imagesizes: width,
    tagName: 'link',
  };
}
