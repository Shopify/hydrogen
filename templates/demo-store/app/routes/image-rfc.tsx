import {type LoaderArgs} from '@hydrogen/remix';
import {useLoaderData} from '@remix-run/react';
import {json} from '@remix-run/oxygen';

/* @TODO: 
  - [ ] Support original aspect ratio
  - [ ] Picture element
  - [ ] Support for non-100% widths
  - [ ] Support for third party data loaders
  - [ ] Create guide/docs
*/

interface ImageConfig {
  intervals: number;
  startingWidth: number;
  incrementSize: number;
  placeholderWidth: number;
}
type Crop = 'center' | 'top' | 'bottom' | 'left' | 'right' | undefined;

type ImageRFCData = {
  product: {
    featuredImage: {
      altText: string;
      url: string;
    };
  };
};

export const IMAGE_FRAGMENT = `#graphql
  fragment Image on Image {
    altText
    url
  }
`;

export async function loader({context: {storefront}}: LoaderArgs) {
  const data: ImageRFCData = await storefront.query({
    query: `#graphql
    query {
      product(handle: "snowboard") {
       featuredImage {
         ...Image
       }
      }
    }
    ${IMAGE_FRAGMENT}
  `,
    variables: {},
  });

  return json(data.product.featuredImage);
}

export default function ImageRFC() {
  const {altText, url} = useLoaderData<typeof loader>();

  return <Image src={url} alt={altText} aspectRatio="1/1" sizes="100vw" />;

  /* Picture component should look something like:
      <Picture
        width="100%"
        {...props}>
        <Image 
          src={data.src} 
          aspectRatio="4/5" 
          sizes="100vw" 
          media="(min-width: 800px)" />
        <Image 
          src={data.src} 
          aspectRatio="2/3" 
          sizes="100vw" 
          media="(min-width: 1200px)" />
    </Picture>

    When inside <Picture /> the <Image /> component should render a <source> element,
    the last <Image /> component should render an <img> element.
  */
}

export function Image({
  as: Component = 'img',
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
  as?: 'img' | 'source';
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
    <Component
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

export function parseAspectRatio(aspectRatio: string) {
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
