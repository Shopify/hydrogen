import * as React from 'react';
import type {PartialDeep, Simplify} from 'type-fest';
import type {Image as ImageType} from './storefront-api-types.js';

/*
 * An optional prop you can use to change the
 * default srcSet generation behaviour
 */
type SrcSetOptions = {
  intervals: number;
  startingWidth: number;
  incrementSize: number;
  placeholderWidth: number;
};

type HtmlImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export type ImageLoader = (params: ShopifyLoaderParams) => string;

export type ShopifyLoaderOptions = {
  crop?: 'top' | 'bottom' | 'left' | 'right' | 'center';
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
 * @TODO: Expand to include focal point support; and/or switch this to be an SF API type
 */
type Crop = 'center' | 'top' | 'bottom' | 'left' | 'right' | undefined;

export type ShopifyImageProps = HtmlImageProps & ShopifyImageBaseProps;

type ShopifyImageBaseProps = {
  /** The HTML element to use for the image, `source` should only be used inside `picture` */
  as?: 'img' | 'source';
  /** Data mapping to the Storefront API `Image` object. Must be an Image object.
   * Optionally, import the `IMAGE_FRAGMENT` to use in your GraphQL queries.
   *
   * @example
   * ```
   * import {IMAGE_FRAGMENT, Image} from '@shopify/hydrogen';
   *
   * export const IMAGE_QUERY = `#graphql
   * ${IMAGE_FRAGMENT}
   * query {
   *   product {
   *     featuredImage {
   *       ...Image
   *     }
   *   }
   * }`
   *
   * <Image
   *   data={productImage}
   *   sizes="(min-width: 45em) 50vw, 100vw"
   *   aspectRatio="4/5"
   * />
   * ```
   *
   * Image: {@link https://shopify.dev/api/storefront/reference/common-objects/image}
   */
  data?: PartialDeep<ImageType, {recurseIntoArrays: true}>;
  /** The aspect ratio of the image, in the format of `width/height`.
   *
   * @example
   * ```
   * <Image data={productImage} aspectRatio="4/5" />
   * ```
   */
  aspectRatio?: string;
  /** The crop position of the image.
   *
   * @remarks
   * In the event that AspectRatio is set, without specifying a crop,
   * the Shopify CDN won't return the expected image.
   *
   * @defaultValue `center`
   */
  crop?: Crop;
  /** A function that returns a URL string for an image.
   *
   * @remarks
   * By default, this uses Shopify’s CDN {@link https://cdn.shopify.com/} but you can provide
   * your own function to use a another provider, as long as they support URL based image transformations.
   */
  loader?: ImageLoader;
  /** An optional prop you can use to change the default srcSet generation behaviour */
  srcSetOptions?: SrcSetOptions;
  /** @deprecated Use `crop`, `width`, `height`, and `src` props, and/or `data` prop */
  loaderOptions?: ShopifyLoaderOptions;
  /** @deprecated Autocalculated, use only `width` prop, or srcSetOptions */
  widths?: (HtmlImageProps['width'] | ImageType['width'])[];
};

/**
 * A Storefront API GraphQL fragment that can be used to query for an image.
 */
export const IMAGE_FRAGMENT = `#graphql
  fragment Image on Image {
    altText
    url
    width
    height
  }
`;

/**
 * Hydrgen’s Image component is a wrapper around the HTML image element.
 * It supports the same props as the HTML image element, but automatically
 * generates the srcSet and sizes attributes for you. For most use cases,
 * you’ll want to set the `aspectRatio` prop to ensure the image is sized
 * correctly.
 *
 * @example
 * A responsive image with a 4:5 aspect ratio:
 * ```
 * <Image
 *   data={product.featuredImage}
 *   aspectRatio="4/5"
 *   sizes="(min-width: 45em) 40vw, 100vw"
 * />
 * ```
 * @example
 * A fixed size image:
 * ```
 * <Image
 *   data={product.featuredImage}
 *   width={100}
 *   height={100}
 * />
 * ```
 *
 * {@link https://shopify.dev/docs/api/hydrogen-react/components/image}
 */
export function Image({
  as: Component = 'img',
  data,
  aspectRatio,
  crop = 'center',
  loader = shopifyLoader,
  srcSetOptions = {
    intervals: 15,
    startingWidth: 200,
    incrementSize: 200,
    placeholderWidth: 100,
  },
  alt,
  decoding = 'async',
  height,
  loading = 'lazy',
  sizes,
  src,
  width,
  loaderOptions,
  widths,
  ...passthroughProps
}: ShopifyImageProps): JSX.Element | null {
  /*
   * Deprecated Props from original Image component
   */
  if (__HYDROGEN_DEV__) {
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

  if (__HYDROGEN_DEV__ && !normalizedSrc) {
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

  if (__HYDROGEN_DEV__ && !sizes && !isFixedWidth(normalizedWidth)) {
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

    const fixedHeight = intHeight
      ? intHeight
      : fixedAspectRatio && intWidth
      ? intWidth * (parseAspectRatio(fixedAspectRatio) ?? 1)
      : undefined;

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(normalizedSrc, sizesArray, loader),
      src: loader({
        src: normalizedSrc,
        width: intWidth,
        height: fixedHeight,
        crop: normalizedHeight === 'auto' ? undefined : crop,
      }),
      alt: normalizedAlt,
      decoding,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio: fixedAspectRatio,
      },
      width: intWidth,
      height: fixedHeight,
      loading,
      ...passthroughProps,
    });
  } else {
    const sizesArray =
      imageWidths === undefined
        ? undefined
        : generateSizes(imageWidths, normalizedAspectRatio, crop);

    const placeholderHeight =
      normalizedAspectRatio && placeholderWidth
        ? placeholderWidth * (parseAspectRatio(normalizedAspectRatio) ?? 1)
        : undefined;

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(normalizedSrc, sizesArray),
      src: loader({
        src: normalizedSrc,
        width: placeholderWidth,
        height: placeholderHeight,
        crop,
      }),
      alt: normalizedAlt,
      decoding,
      sizes,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio: normalizedAspectRatio,
      },
      width: placeholderWidth,
      height: placeholderHeight,
      loading,
      ...passthroughProps,
    });
  }
}

/**
 * Checks whether the width and height share the same unit type
 * @param width - The width of the image, e.g. 100% | 10px
 * @param height - The height of the image, e.g. auto | 100px
 * @returns Whether the width and height share the same unit type (boolean)
 */
function unitsMatch(
  width: string | number = '100%',
  height: string | number = 'auto',
): boolean {
  return (
    getUnitValueParts(width.toString()).unit ===
    getUnitValueParts(height.toString()).unit
  );
}

/**
 * Given a CSS size, returns the unit and number parts of the value
 * @param value - The CSS size, e.g. 100px
 * @returns The unit and number parts of the value, e.g. \{unit: 'px', number: 100\}
 */
function getUnitValueParts(value: string): {unit: string; number: number} {
  const unit = value.replace(/[0-9.]/g, '');
  const number = parseFloat(value.replace(unit, ''));

  return {
    unit: unit === '' ? (number === undefined ? 'auto' : 'px') : unit,
    number,
  };
}

/**
 * Given a value, returns the width of the image as an integer in pixels
 * @param value - The width of the image, e.g. 16px | 1rem | 1em | 16
 * @returns The width of the image in pixels, e.g. 16, or undefined if the value is not a fixed unit
 */
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
}

/**
 * This function checks whether a width is fixed or not.
 * @param width - The width of the image, e.g. 100 | '100px' | '100em' | '100rem'
 * @returns Whether the width is fixed or not
 */
function isFixedWidth(width: string | number): boolean {
  const fixedEndings = /\d(px|em|rem)$/;
  return (
    typeof width === 'number' ||
    (typeof width === 'string' && fixedEndings.test(width))
  );
}

/**
 * This function generates a srcSet for Shopify images.
 * @param src - The source URL of the image, e.g. https://cdn.shopify.com/static/sample-images/garnished.jpeg
 * @param sizesArray - An array of objects containing the `width`, `height`, and `crop` of the image, e.g. [\{width: 200, height: 200, crop: 'center'\}, \{width: 400, height: 400, crop: 'center'\}]
 * @param loader - A function that takes a Shopify image URL and returns a Shopify image URL with the correct query parameters
 * @returns A srcSet for Shopify images, e.g. 'https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=200&height=200&crop=center 200w, https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=400&height=400&crop=center 400w'
 */
export function generateShopifySrcSet(
  src?: string,
  sizesArray?: Array<{width?: number; height?: number; crop?: Crop}>,
  loader: ImageLoader = shopifyLoader,
): string {
  if (!src) {
    return '';
  }

  if (sizesArray?.length === 0 || !sizesArray) {
    return src;
  }

  return sizesArray
    .map(
      (size, i) =>
        `${loader({
          src,
          width: size.width,
          height: size.height,
          crop: size.crop,
        })} ${sizesArray.length === 3 ? `${i + 1}x` : `${size.width ?? 0}w`}`,
    )
    .join(`, `);
}

/**
 * This function generates an array of sizes for Shopify images, for both fixed and responsive images.
 * @param width - The CSS width of the image
 * @param intervals - The number of intervals to generate
 * @param startingWidth - The starting width of the image
 * @param incrementSize - The size of each interval
 * @returns An array of widths
 */
export function generateImageWidths(
  width: string | number = '100%',
  intervals: number,
  startingWidth: number,
  incrementSize: number,
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

/**
 * Simple utility function to convert an aspect ratio CSS string to a decimal, currently only supports values like `1/1`, not `0.5`, or `auto`
 * @param aspectRatio - The aspect ratio of the image, e.g. `1/1`
 * @returns The aspect ratio as a number, e.g. `0.5`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio}
 */
export function parseAspectRatio(aspectRatio?: string): number | undefined {
  if (!aspectRatio) return;
  const [width, height] = aspectRatio.split('/');
  return 1 / (Number(width) / Number(height));
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

/**
 * The shopifyLoader function is a simple utility function that takes a src, width,
 * height, and crop and returns a string that can be used as the src for an image.
 * It can be used with the Hydrogen Image component or with the next/image component.
 * (or any others that accept equivalent configuration)
 * @param src - The source URL of the image, e.g. `https://cdn.shopify.com/static/sample-images/garnished.jpeg`
 * @param width - The width of the image, e.g. `100`
 * @param height - The height of the image, e.g. `100`
 * @param crop - The crop of the image, e.g. `center`
 * @returns A Shopify image URL with the correct query parameters, e.g. `https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=100&height=100&crop=center`
 */
export const shopifyLoader: ImageLoader = ({src, width, height, crop}) => {
  if (!src) {
    return '';
  }

  const url = new URL(src);
  width && url.searchParams.append('width', Math.round(width).toString());
  height && url.searchParams.append('height', Math.round(height).toString());
  crop && url.searchParams.append('crop', crop);
  return url.href;
};
