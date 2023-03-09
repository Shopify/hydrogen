import * as React from 'react';
import type {PartialDeep, Simplify} from 'type-fest';
import type {Image as ImageType} from './storefront-api-types.js';

/*
 * An optional prop you can use to change the
 * default srcSet generation behaviour
 */
interface SrcSetOptions {
  intervals: number;
  startingWidth: number;
  incrementSize: number;
  placeholderWidth: number;
}

type HtmlImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export type ShopifyLoaderOptions = {
  crop?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  scale?: 2 | 3;
  width?: HtmlImageProps['width'] | ImageType['width'];
  height?: HtmlImageProps['height'] | ImageType['height'];
};

export type ShopifyLoaderParams = Simplify<
  ShopifyLoaderOptions & {
    src?: ImageType['url'];
    width?: number;
    height?: number;
    crop?: Crop;
  }
>;

/*
 * TODO: Expand to include focal point support;
 * or switch this to be an SF API type
 */

type Crop = 'center' | 'top' | 'bottom' | 'left' | 'right' | undefined;

export type ShopifyImageProps = {
  as?: 'img' | 'source';
  data?: PartialDeep<ImageType, {recurseIntoArrays: true}>;
  src?: string;
  loader?: (params: ShopifyLoaderParams) => string;
  width?: string | number;
  height?: string | number;
  crop?: Crop;
  sizes?: string;
  aspectRatio?: string;
  srcSetOptions?: SrcSetOptions;
  alt?: string;
  loading?: 'lazy' | 'eager';
  loaderOptions?: ShopifyLoaderOptions;
  widths?: (HtmlImageProps['width'] | ImageType['width'])[];
};

export function Image({
  /**
   * An object with fields that correspond to the Storefront API's
   * [Image object](https://shopify.dev/api/storefront/reference/common-objects/image).
   */
  data,
  as: Component = 'img',
  src,
  /*
   * Supports third party loaders, which are expected to provide
   * a function that can generate a URL string
   */
  loader = shopifyLoader,
  /*
   * The default behaviour is a responsive image, set to 100%, that fills
   * the width of its container. It’s not declared in the props.
   */
  width,
  height,
  /*
   * The default crop is center, in the event that AspectRatio is set,
   * without specifying a crop, Imagery won't return the expected image.
   */
  crop = 'center',
  sizes,
  /*
   * aspectRatio is a string in the format of 'width/height'
   * it's used to generate the srcSet URLs, and to set the
   * aspect ratio of the image element to prevent CLS.
   */
  aspectRatio,
  /*
   * An optional prop you can use to change
   * the default srcSet generation behaviour
   */
  srcSetOptions = {
    intervals: 10,
    startingWidth: 300,
    incrementSize: 300,
    placeholderWidth: 100,
  },
  alt,
  loading = 'lazy',
  /*
   * Deprecated property from original Image component,
   * you can now use the flat `crop`, `width`, and `height` props
   * as well as `src` and `data` to achieve the same result.
   */
  loaderOptions,
  /*
   * Deprecated property from original Image component,
   * widths are now calculated automatically based on the
   * config and width props.
   */
  widths,
  ...passthroughProps
}: HtmlImageProps & ShopifyImageProps): JSX.Element | null {
  /*
   * Deprecated Props from original Image component
   */
  if (loaderOptions) {
    console.warn(
      [
        `Deprecated property from original Image component in use:`,
        `Use the \`crop\`, \`width\`, \`height\`, and src props, or`,
        `the \`data\` prop to achieve the same result. Image used is ${
          src || data?.url || 'unknown'
        }`,
      ].join(' '),
    );
  }

  if (widths) {
    console.warn(
      [
        `Deprecated property from original Image component in use:`,
        `\`widths\` are now calculated automatically based on the`,
        `config and width props. Image used is ${
          src || data?.url || 'unknown'
        }`,
      ].join(' '),
    );
  }

  /* Only use data width if height is also set */

  const dataWidth: number | undefined =
    data?.width && data?.height ? data?.width : undefined;

  const dataHeight: number | undefined =
    data?.width && data?.height ? data?.height : undefined;

  const dataUnitsMatch: boolean = unitsMatch(dataWidth, dataHeight);

  /*
   * Gets normalized values for width, height, src, alt, and aspectRatio props
   * supporting the presence of `data` in addition to flat props.
   */

  const normalizedWidthProp: string | number = width || '100%';

  const normalizedWidth = `${
    getUnitValueParts(normalizedWidthProp.toString()).number
  }${getUnitValueParts(normalizedWidthProp.toString()).unit}`;

  const normalizedHeight: string =
    height === undefined
      ? 'auto'
      : `${getUnitValueParts(height.toString()).number}${
          getUnitValueParts(height.toString()).unit
        }`;

  const normalizedSrc: string | undefined = src || data?.url;

  if (!normalizedSrc) {
    console.warn(`No src or data.url provided to Image component.`);
  }

  const normalizedAlt: string =
    data?.altText && !alt ? data?.altText : alt || '';

  const normalizedAspectRatio: string | undefined = aspectRatio
    ? aspectRatio
    : dataUnitsMatch
    ? [
        getNormalizedFixedUnit(dataWidth),
        getNormalizedFixedUnit(dataHeight),
      ].join('/')
    : undefined;

  const {intervals, startingWidth, incrementSize, placeholderWidth} =
    srcSetOptions;

  /*
   * This function creates an array of widths to be used in srcSet
   */
  const imageWidths = generateImageWidths(
    width,
    intervals,
    startingWidth,
    incrementSize,
  );

  if (!sizes && !isFixedWidth(normalizedWidth)) {
    console.warn(
      [
        'No sizes prop provided to Image component,',
        'you may be loading unnecessarily large images.',
        `Image used is ${src || data?.url || 'unknown'}`,
      ].join(' '),
    );
  }

  /*
   * We check to see whether the image is fixed width or not,
   * if fixed, we still provide a srcSet, but only to account for
   * different pixel densities.
   */
  if (isFixedWidth(normalizedWidth)) {
    const intWidth: number | undefined = getNormalizedFixedUnit(width);
    const intHeight: number | undefined = getNormalizedFixedUnit(height);

    /*
     * The aspect ratio for fixed width images is taken from the explicitly
     * set prop, but if that's not present, and both width and height are
     * set, we calculate the aspect ratio from the width and height—as
     * long as they share the same unit type (e.g. both are 'px').
     */
    const fixedAspectRatio = aspectRatio
      ? aspectRatio
      : unitsMatch(normalizedWidth, normalizedHeight)
      ? [intWidth, intHeight].join('/')
      : normalizedAspectRatio
      ? normalizedAspectRatio
      : undefined;

    /*
     * The Sizes Array generates an array of all of the parts
     * that make up the srcSet, including the width, height, and crop
     */
    const sizesArray =
      imageWidths === undefined
        ? undefined
        : generateSizes(imageWidths, fixedAspectRatio, crop);

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(normalizedSrc, sizesArray),
      src: loader({
        src: normalizedSrc,
        width: intWidth,
        height: intHeight
          ? intHeight
          : fixedAspectRatio && intWidth
          ? intWidth * (parseAspectRatio(fixedAspectRatio) ?? 1)
          : undefined,
        crop: normalizedHeight === 'auto' ? undefined : crop,
      }),
      alt: normalizedAlt,
      sizes: sizes || normalizedWidth,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio: fixedAspectRatio,
      },
      loading,
      ...passthroughProps,
    });
  } else {
    const sizesArray =
      imageWidths === undefined
        ? undefined
        : generateSizes(imageWidths, normalizedAspectRatio, crop);

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(normalizedSrc, sizesArray),
      src: loader({
        src: normalizedSrc,
        width: placeholderWidth,
        height:
          normalizedAspectRatio && placeholderWidth
            ? placeholderWidth * (parseAspectRatio(normalizedAspectRatio) ?? 1)
            : undefined,
      }),
      alt: normalizedAlt,
      sizes,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio: normalizedAspectRatio,
      },
      loading,
      ...passthroughProps,
    });
  }
}

function unitsMatch(
  width: string | number = '100%',
  height: string | number = 'auto',
): boolean {
  return (
    getUnitValueParts(width.toString()).unit ===
    getUnitValueParts(height.toString()).unit
  );
  /*
      Given:
        width = '100px'
        height = 'auto'
      Returns:
        false

      Given:
        width = '100px'
        height = '50px'
      Returns:
        true
   */
}

function getUnitValueParts(value: string): {unit: string; number: number} {
  const unit = value.replace(/[0-9.]/g, '');
  const number = parseFloat(value.replace(unit, ''));

  return {
    unit: unit === '' ? (number === undefined ? 'auto' : 'px') : unit,
    number,
  };
  /*
      Given:
        value = '100px'
      Returns:
        {
          unit: 'px',
          number: 100
        }
   */
}

function getNormalizedFixedUnit(value?: string | number): number | undefined {
  if (value === undefined) {
    return;
  }

  const {unit, number} = getUnitValueParts(value.toString());

  switch (unit) {
    case 'em':
      return number * 16;
    case 'rem':
      return number * 16;
    case 'px':
      return number;
    case '':
      return number;
    default:
      return;
  }
  /*
      Given:
        value = 16px | 1rem | 1em | 16
      Returns:
        16

      Given:
        value = 100%
      Returns:
        undefined
   */
}

function isFixedWidth(width: string | number): boolean {
  const fixedEndings = /\d(px|em|rem)$/;
  return (
    typeof width === 'number' ||
    (typeof width === 'string' && fixedEndings.test(width))
  );
  /*
    Given:
      width = 100 | '100px' | '100em' | '100rem'
    Returns:
      true
  */
}

export function generateShopifySrcSet(
  src?: string,
  sizesArray?: Array<{width?: number; height?: number; crop?: Crop}>,
): string {
  if (!src) {
    return '';
  }

  if (sizesArray?.length === 0 || !sizesArray) {
    return src;
  }

  return sizesArray
    .map(
      (size) =>
        `${shopifyLoader({
          src,
          width: size.width,
          height: size.height,
          crop: size.crop,
        })} ${size.width || 0}w`,
    )
    .join(`, `);
  /*
      Given:
        src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg'
        sizesArray = [
          {width: 200, height: 200, crop: 'center'},
          {width: 400, height: 400, crop: 'center'},
        ]
      Returns:
        'https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=200&height=200&crop=center 200w, https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=400&height=400&crop=center 400w'
   */
}

export function generateImageWidths(
  width: string | number = '100%',
  intervals = 20,
  startingWidth = 200,
  incrementSize = 100,
): number[] {
  const responsive = Array.from(
    {length: intervals},
    (_, i) => i * incrementSize + startingWidth,
  );

  const fixed = Array.from(
    {length: 3},
    (_, i) => (i + 1) * (getNormalizedFixedUnit(width) ?? 0),
  );

  return isFixedWidth(width) ? fixed : responsive;
}

// Simple utility function to convert 1/1 to [1, 1]
export function parseAspectRatio(aspectRatio?: string): number | undefined {
  if (!aspectRatio) return;
  const [width, height] = aspectRatio.split('/');
  return 1 / (Number(width) / Number(height));
  /*
    Given:
      '1/1'
    Returns:
      0.5,
    Given:
      '4/3'
    Returns:
      0.75
  */
}

// Generate data needed for Imagery loader
export function generateSizes(
  imageWidths?: number[],
  aspectRatio?: string,
  crop: Crop = 'center',
):
  | {
      width: number;
      height: number | undefined;
      crop: Crop;
    }[]
  | undefined {
  if (!imageWidths) return;
  const sizes = imageWidths.map((width: number) => {
    return {
      width,
      height: aspectRatio
        ? width * (parseAspectRatio(aspectRatio) ?? 1)
        : undefined,
      crop,
    };
  });
  return sizes;
  /*
    Given:
      ([100, 200], 1/1, 'center')
    Returns:
      [{width: 100, height: 100, crop: 'center'},
      {width: 200, height: 200, crop: 'center'}]
  */
}

/*
 * The shopifyLoader function is a simple utility function that takes a src, width,
 * height, and crop and returns a string that can be used as the src for an image.
 * It can be used with the Hydrogen Image component or with the next/image component.
 * (or any others that accept equivalent configuration)
 */
export function shopifyLoader({
  src,
  width,
  height,
  crop,
}: {
  src?: string;
  width?: number;
  height?: number;
  crop?: Crop;
}): string {
  if (!src) {
    return '';
  }

  const url = new URL(src);
  width && url.searchParams.append('width', Math.round(width).toString());
  height && url.searchParams.append('height', Math.round(height).toString());
  crop && url.searchParams.append('crop', crop);
  return url.href;
  /*
    Given:
      src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg'
      width = 100
      height = 100
      crop = 'center'
    Returns:
      'https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=100&height=100&crop=center'
  */
}
