# Hydrogen Image Preloading

Preloading above-the-fold content has a powerful effect on Largest Contentful Paint (LCP). Specially when it comes to fonts and images, as both images and text nodes can be LCP candidates. Hero images and large runs of text that are rendered using web fonts can benefit significantly from a well-placed preload hint, and should be used when there are opportunities to deliver these important bits of content to the user faster.

## Current situation

Hydrogen currently does not offer a native abstraction, example or guide on how to effectively implement image preloading. Although Remix offers all the right primitives, developers have to go out of their way to recognize the importance and implementation details of preloading critical resources to improve performance.

## Proposal

The follow driven-development doc, demonstrates a proposal to facilitate _images_ preloading.

> [!NOTE]
> A separate proposal will be made for handling web fonts and other critical resources

### Requirements

Export hydrogen-react `Image` component inner utilities within `@shopify/hydrogen`

| Utility                | Function                                               |
|----------------------- |--------------------------------------------------------|
| `generateImageWidths`  | Generates an array of sizes for Shopify images, for both fixed and responsive images. |
| `generateSizes`        | Generates an array of widths, heights and crops needed for Imagery loader |
| `generateSrcSet`       | Generates a `srcSet` for Shopify images based on an array of sizes  |
| `shopifyLoader`        | Appends a width, height and crop url query params to a given Shopify CDN url |

Export the `genPreloadImageLinkMeta` from hydrogen which internally uses this utilities

```ts
// src/genPreloadImageLinkMeta.ts in hydrogen-react
import {
  generateImageWidths,
  generateSizes,
  generateSrcSet,
  shopifyLoader,
} from './src/Image.ts';

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

// Default props match those of the Image component
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
```

### Implementation

On each applicable route, import the `genPreloadImageLinkMeta` utility and call it if a `preload` prop is present
in the `loader` return

```diff
// app/routes/product.$handle.tsx

+ import {genPreloadImageLinkMeta} from '@shopify/hydrogen'

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const metas = [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
  ] as MetaDescriptor[];

+ if (data?.preload.image) {
+   const preloadImageLink = genPreloadImageLinkMeta({
+     url: data.preload.image.url,
+   });
+   metas.push(preloadImageLink);
+ }
  return metas;
};

export async function loader({params, request, context}: LoaderFunctionArgs) {
  // ...other code
  return defer({
    product,
    variants,
+   preload: {image: product.selectedVariant.image},
  });
}
```

> [!NOTE] Repeat for any other routes requiring it such as index (main Hero), collection (first 4 products)

## Additional Reading

- [Preloading responsive images](https://web.dev/articles/preload-responsive-images)
- [Preload critical assets to improve loading speed](https://web.dev/articles/preload-critical-assets)
