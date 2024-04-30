import {
  generateImageWidths,
  generateSizes,
  generateSrcSet,
  shopifyLoader,
} from '@shopify/hydrogen';

type GenerateImageWidthsParams = Parameters<typeof generateImageWidths>;
type GenerateSizesParams = Parameters<typeof generateSizes>;

type GenPreloadImageLinkMetaProps = {
  url: string;
  width?: GenerateImageWidthsParams[0];
  srcSet?: {
    interval: GenerateImageWidthsParams[1];
    startingWidth: GenerateImageWidthsParams[2];
    incrementSize: GenerateImageWidthsParams[3];
  };
  sizes?: {
    aspectRatio: GenerateSizesParams[1];
    crop: GenerateSizesParams[2];
  };
};

const defaultProps = {
  url: '',
  width: '100%',
  srcSet: {interval: 15, startingWidth: 200, incrementSize: 200},
  sizes: {aspectRatio: '1/1', crop: 'center'},
} as const;

export function genPreloadImageLinkMeta({
  url,
  width = defaultProps.width,
  srcSet = defaultProps.srcSet,
  sizes = defaultProps.sizes,
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

  const widths = generateImageWidths(
    width,
    interval,
    startingWidth,
    incrementSize,
  );
  const imagesizes = generateSizes(widths, aspectRatio, crop);
  const imagesrcset = generateSrcSet(url, imagesizes, shopifyLoader);

  return {tagName: 'link', rel: 'preload', as: 'image', imagesrcset, href: url};
}
