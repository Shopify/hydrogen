import React from 'react';

/*
 * An optional prop you can use to change the
 * default srcSet generation behaviour
 */
interface ImageConfig {
  intervals: number;
  startingWidth: number;
  incrementSize: number;
  placeholderWidth: number;
}

/*
 * TODO: Expand to include focal point support;
 * or switch this to be an SF API type
 */

type Crop = 'center' | 'top' | 'bottom' | 'left' | 'right';

export function Image({
  as: Component = 'img',
  src,
  /*
   * Supports third party loaders, which are expected to provide
   * a function that can generate a URL string
   */
  loader = shopifyLoader,
  /*
   * The default behaviour is a responsive image that fills
   * the width of its container.
   */
  width = '100%',
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
  config = {
    intervals: 10,
    startingWidth: 300,
    incrementSize: 300,
    placeholderWidth: 100,
  },
  alt,
  loading = 'lazy',
  ...passthroughProps
}: {
  as?: 'img' | 'source';
  src: string;
  loader?: Function;
  width?: string | number;
  height?: string | number;
  crop?: Crop;
  sizes?: string;
  aspectRatio?: string;
  config?: ImageConfig;
  alt?: string;
  loading?: 'lazy' | 'eager';
}) {
  /*
   * Sanitizes width and height inputs to account for 'number' type
   */
  let normalizedWidth: string =
    getUnitValueParts(width.toString()).number +
    getUnitValueParts(width.toString()).unit;

  let normalizedHeight: string =
    height === undefined
      ? 'auto'
      : getUnitValueParts(height.toString()).number +
        getUnitValueParts(height.toString()).unit;

  const {intervals, startingWidth, incrementSize, placeholderWidth} = config;

  /*
   * This function creates an array of widths to be used in srcSet
   */
  const widths = generateImageWidths(
    width,
    intervals,
    startingWidth,
    incrementSize,
  );

  /*
   * We check to see whether the image is fixed width or not,
   * if fixed, we still provide a srcSet, but only to account for
   * different pixel densities.
   */
  if (isFixedWidth(width)) {
    let intWidth: number | undefined = getNormalizedFixedUnit(width);
    let intHeight: number | undefined = getNormalizedFixedUnit(height);

    /*
     * The aspect ratio for fixed with images is taken from the explicitly
     * set prop, but if that's not present, and both width and height are
     * set, we calculate the aspect ratio from the width and height — as
     * long as they share the same unit type (e.g. both are 'px').
     */
    const fixedAspectRatio = aspectRatio
      ? aspectRatio
      : unitsMatch(width, height)
      ? `${intWidth}/${intHeight}`
      : undefined;

    /*
     * The Sizes Array generates an array of all of the parts
     * that make up the srcSet, including the width, height, and crop
     */
    const sizesArray =
      widths === undefined
        ? undefined
        : generateSizes(widths, fixedAspectRatio, crop);

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(src, sizesArray),
      src: loader(
        src,
        intWidth,
        intHeight
          ? intHeight
          : aspectRatio && intWidth
          ? intWidth * (parseAspectRatio(aspectRatio) ?? 1)
          : undefined,
        normalizedHeight === 'auto' ? undefined : crop,
      ),
      alt,
      sizes: sizes || normalizedWidth,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio,
      },
      loading,
      ...passthroughProps,
    });
  } else {
    const sizesArray =
      widths === undefined
        ? undefined
        : generateSizes(widths, aspectRatio, crop);

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(src, sizesArray),
      src: loader(
        src,
        placeholderWidth,
        aspectRatio && placeholderWidth
          ? placeholderWidth * (parseAspectRatio(aspectRatio) ?? 1)
          : undefined,
      ),
      alt,
      sizes,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio,
      },
      loading,
      ...passthroughProps,
    });
  }
}

function unitsMatch(
  width: string | number = '100%',
  height: string | number = 'auto',
) {
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

function getUnitValueParts(value: string) {
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

function getNormalizedFixedUnit(value?: string | number) {
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

function isFixedWidth(width: string | number) {
  const fixedEndings = new RegExp('px|em|rem', 'g');
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
  src: string,
  sizesArray?: Array<{width?: number; height?: number; crop?: Crop}>,
) {
  if (sizesArray?.length === 0 || !sizesArray) {
    return src;
  }

  return sizesArray
    .map(
      (size) =>
        shopifyLoader(src, size.width, size.height, size.crop) +
        ' ' +
        size.width +
        'w',
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
  intervals: number = 20,
  startingWidth: number = 200,
  incrementSize: number = 100,
) {
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
export function parseAspectRatio(aspectRatio?: string) {
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
  widths?: number[],
  aspectRatio?: string,
  crop: Crop = 'center',
) {
  if (!widths) return;
  const sizes = widths.map((width: number) => {
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
export function shopifyLoader(
  src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg',
  width?: number,
  height?: number,
  crop?: Crop,
) {
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
