import React from 'react';

interface ImageConfig {
  intervals: number;
  startingWidth: number;
  incrementSize: number;
  placeholderWidth: number;
}

type ImageComponent = {
  as?: 'img' | 'source';
  src: string;
  width?: string | number;
  height?: string | number;
  crop: Crop;
  sizes: string;
  aspectRatio: string;
  scale?: number;
  priority?: boolean;
  config?: ImageConfig;
  alt: string;
};

type Crop = 'center' | 'top' | 'bottom' | 'left' | 'right' | undefined;

export function Image({
  as: Component = 'img',
  src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg',
  width = '100%',
  height,
  crop = 'center',
  sizes = '(min-width: 768px) 50vw, 100vw',
  aspectRatio,
  scale,
  priority,
  config = {
    intervals: 10,
    startingWidth: 300,
    incrementSize: 300,
    placeholderWidth: 100,
  },
  alt = 'Test Alt Tag',
  ...passthroughProps
}: ImageComponent) {
  let normalizedWidth: string =
    getUnitValueParts(width.toString()).number +
    getUnitValueParts(width.toString()).unit;

  let normalizedHeight: string =
    height === undefined
      ? 'auto'
      : getUnitValueParts(height.toString()).number +
        getUnitValueParts(height.toString()).unit;

  if (!isFixedWidth(width)) {
    const {intervals, startingWidth, incrementSize, placeholderWidth} = config;

    const widths = generateImageWidths(
      width,
      intervals,
      startingWidth,
      incrementSize,
    );

    const sizesArray = generateSizes(widths, aspectRatio, crop);

    return React.createElement(Component, {
      srcSet: generateShopifySrcSet(src, sizesArray),
      src: generateImagerySrc(
        src,
        placeholderWidth,
        placeholderWidth * parseAspectRatio(aspectRatio),
      ),
      alt,
      sizes,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio,
      },
      ...passthroughProps,
    });
  } else {
    // width is fixed
    let intWidth: number | undefined = getNormalizedFixedUnit(width);
    let intHeight: number | undefined = getNormalizedFixedUnit(height);

    return React.createElement(Component, {
      src: generateImagerySrc(
        src,
        intWidth,
        (aspectRatio && intWidth
          ? intWidth * parseAspectRatio(aspectRatio)
          : intHeight) ?? undefined,
        normalizedHeight === 'auto' ? undefined : crop,
      ),
      alt,
      style: {
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio,
      },
      ...passthroughProps,
    });
  }
}

function getUnitValueParts(value: string) {
  const unit = value.replace(/[0-9.]/g, '');
  const number = parseFloat(value.replace(unit, ''));

  return {
    unit: unit === '' ? (number === undefined ? 'auto' : 'px') : unit,
    number,
  };
}

function getNormalizedFixedUnit(value: string | number | undefined) {
  if (value === undefined) {
    return undefined;
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
      return undefined;
  }
}

function isFixedWidth(width: string | number) {
  const fixedEndings = new RegExp('px|em|rem', 'g');
  return (
    typeof width === 'number' ||
    (typeof width === 'string' && fixedEndings.test(width))
  );
}

export function generateShopifySrcSet(
  src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg',
  sizesArray: Array<{width: number; height: number; crop: Crop}> | undefined,
) {
  if (sizesArray?.length === 0 || !sizesArray) {
    return src;
  }

  return sizesArray
    .map(
      (size) =>
        generateImagerySrc(src, size.width, size.height, size.crop) +
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
  intervals = 20,
  startingWidth = 200,
  incrementSize = 100,
  scale = 1,
) {
  const responsive = Array.from(
    {length: intervals},
    (_, i) => (i * incrementSize + startingWidth) * scale,
  );

  return isFixedWidth(width) ? [getNormalizedFixedUnit(width)] : responsive;
}

// Simple utility function to convert 1/1 to [1, 1]
export function parseAspectRatio(aspectRatio: string) {
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
  widths: number[] | undefined,
  aspectRatio: string,
  crop: Crop = 'center',
) {
  if (!widths) return;
  const sizes = widths.map((width: number) => {
    return {
      width,
      height: width * parseAspectRatio(aspectRatio),
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

export function generateImagerySrc(
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
