import {type LoaderArgs} from '@hydrogen/remix';
import {useLoaderData} from '@remix-run/react';
import {json} from '@remix-run/oxygen';

import {getLocalizationFromLang} from '~/lib/utils';

export async function loader({params, context: {storefront}}: LoaderArgs) {
  const {language, country} = getLocalizationFromLang(params.lang);

  if (
    params.lang &&
    language === 'EN' &&
    country === 'US' &&
    params.lang !== 'EN-US'
  ) {
    // If the lang URL param is defined, yet we still are on `EN-US`
    // the the lang param must be invalid, send to the 404 page
    throw new Response('Not found', {status: 404});
  }

  const data = await storefront.query({
    query: PLAYGROUND_QUERY,
    variables: {
      language,
      country,
    },
  });

  return json(data);
}

export default function Playground() {
  const {
    product: {featuredImage},
  } = useLoaderData<typeof loader>();

  const {altText, url} = featuredImage;

  return (
    <Image src={url} alt={altText} aspectRatio="1/1" sizes="100vw" scale={2} />
  );
}

const PLAYGROUND_QUERY = `#graphql
  query {
    product(handle: "snowboard") {
     featuredImage {
       altText
       url
     }
    }
  }
`;

interface ImageConfig {
  intervals: number;
  startingWidth: number;
  incrementSize: number;
  placeholderWidth: number;
}

export function Image({
  src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg',
  width = '100%',
  sizes = '(min-width: 768px) 50vw, 100vw',
  aspectRatio = '1/1',
  scale = 2,
  config = {
    intervals: 10,
    startingWidth: 300,
    incrementSize: 100,
    placeholderWidth: 100,
  },
  alt = 'Test Alt Tag',
  ...passthroughProps
}: {
  src: string;
  width?: string | number;
  sizes: string;
  aspectRatio: string;
  scale?: number;
  config?: ImageConfig;
  alt: string;
}) {
  const {intervals, startingWidth, incrementSize, placeholderWidth} = config;

  const widths = generateImageWidths(
    width,
    intervals,
    startingWidth,
    incrementSize,
  );

  const sizesArray = generateSizes(widths, aspectRatio);

  return (
    <img
      srcSet={generateShopifySrcSet(src, sizesArray)}
      alt={alt}
      src={generateImagerySrc(
        src,
        placeholderWidth,
        parseAspectRatio(aspectRatio) * placeholderWidth,
      )}
      width={width}
      sizes={sizes}
      style={{aspectRatio}}
      {...passthroughProps}
    />
  );
}

type Crop = 'center' | 'top' | 'bottom' | 'left' | 'right' | undefined;

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
}

export function generateImagerySrc(
  src = 'https://cdn.shopify.com/static/sample-images/garnished.jpeg',
  width: number,
  height: number,
  crop: Crop = 'center',
) {
  // Sample URL: https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=500&height=500&crop=center
  const url = new URL(src);
  width && url.searchParams.append('width', width.toString());
  height && url.searchParams.append('height', height.toString());
  crop && url.searchParams.append('crop', crop);
  return url.href;
}

export function generateImageWidths(
  width: string | number = '100%',
  intervals = 10,
  startingWidth = 250,
  incrementSize = 250,
  scale = 2,
) {
  if (width === '100%') {
    return Array.from(
      {length: intervals},
      (_, i) => (i * incrementSize + startingWidth) * scale,
    );
  }
  // @TODO: if width !== 100% handle relative/fixed sizes: vw/em/rem/px
  return [1000];
}

function parseAspectRatio(aspectRatio: string) {
  const [width, height] = aspectRatio.split('/');
  return Number(width) / Number(height);
}

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
}
