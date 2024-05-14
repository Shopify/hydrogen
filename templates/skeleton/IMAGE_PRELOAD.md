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

Export the `getPreloadImageMeta` from hydrogen which internally uses this utilities

```ts
// src/libs/getPreloadImageMeta.ts in hydrogen-react
import {
  generateImageWidths,
  generateSizes,
  generateSrcSet,
  shopifyLoader,
} from '@shopify/hydrogen';

type GenerateImageWidthsParams = Parameters<typeof generateImageWidths>;
type GenerateSizesParams = Parameters<typeof generateSizes>;

type GetPreloadImageMetaProps = {
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
 * @param {GetPreloadImageMetaProps} props - The props to generate the preload link meta tag
 * @returns {object} - The link meta tag object
 * @example
 * Basic usage with default <Image /> component props:
 * ```
 * const heroImageLink = getPreloadImageMeta({
 *  url: 'https://cdn.shopify.com/s/files/1/0000/0000/0000/files/hero.jpg',
 * });
 * ```
 *
 * @example
 * Usage with custom `width` set in the <Image /> component props:
 * ```
 * const heroImageLink = getPreloadImageMeta({
 *  url: 'https://cdn.shopify.com/s/files/1/0000/0000/0000/files/hero.jpg',
 *  width: '(min-width: 45em) 50vw, 100vw',
 * });
 * ```
 */
export function getPreloadImageMeta({
  url,
  width = defaultProps.width,
  srcSet = defaultProps.srcSet,
  sizes = defaultProps.sizes,
  loader = shopifyLoader,
}: GetPreloadImageMetaProps) {
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
  const imageSrcSet = generateSrcSet(url, imagesizes, activeLoader);

  return {
    as: 'image',
    href: url,
    imageSrcSet,
    rel: 'preload',
    imageSizes: width,
    tagName: 'link',
  };
}
```

### Implementation

On any applicable route, import the `getPreloadImageMeta` utility and call it the `meta` when the loader returns an image that will be rendered above the fold.

#### Product route example

Preload the product featuredImage as it's always rendered above the fold.

```diff
// app/routes/product.$handle.tsx

+ import {getPreloadImageMeta} from '@shopify/hydrogen'

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const metas = [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
  ] as MetaDescriptor[];

  const featuredImage = data?.product?.featuredImage;

+ if (featuredImage) {
+   const preloadImageLink = getPreloadImageMeta({
+     url: data.preload.image.url,
+   });
+   metas.push(preloadImageLink);
+ }

  return metas;
};

export async function loader({params, request, context}) {
  // ...other code
  return defer({ product, variants });
}
```

#### Collection route example

Preload the first 4 product images in the collection as they are assumed to be above or near the top of the fold.

```diff
// app/routes/collections.$handle.tsx

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const metas = [
    {title: `Hydrogen | ${data?.collection.title ?? 'Collection'}`},
  ] as MetaDescriptor[];

  const hasProducts = Number(data?.collection?.products?.nodes?.length) > 0;

+ if (hasProducts) {
+   // Preload the first 4 product images in the collection
+   for (const node of data?.collection?.products?.nodes.slice(0, 4) ?? []) {
+     if (!node.featuredImage) continue;
+     const preloadImageLink = getPreloadImageMeta({
+       url: node.featuredImage.url,
+       width: '(min-width: 45em) 400px, 100vw',
+     });
+     metas.push(preloadImageLink);
+   }
+ }

  return metas;
};

```

> [!IMPORTANT]
> Repeat for any other routes whose layout renders an image at the top of the page.


## Composition

In this section, we explore how the `getPreloadImageMeta` utility would compose with other existing and future Hydrogen `meta` utilities.

### Composing with the `genSeoMeta` utility

```diff
// app/routes/product.$handle.tsx

export function meta({data, matches}) {
  const metas = [];
  const featuredImage = data?.product?.featuredImage;
  const seo = data?.seo;

  // Add collection seo meta
+ if (seo) {
+   const seoMeta = getSeoMeta(data.seo)
+   metas.push(seoMeta)
+ }

  // Add preload product image link tag
+ if (featuredImage) {
+   const preloadImageLink = getPreloadImageMeta({
+     url: data.preload.image.url,
+   });
+   metas.push(preloadImageLink);
+ }

  return metas;
};
```

### Composing with a "future" `genPreloadFontMeta` utility

In this example, we look at how these would further compose with other potential future utilities

```diff
// app/routes/product.$handle.tsx

export function meta({data, matches}) {
  const metas = [];
  const heroImage = data?.featuredCollection?.image;
  const seo = data?.seo;

  // Add home seo meta
+ if (seo) {
+   const seoMeta = getSeoMeta(data.seo)
+   metas.push(seoMeta)
+ }

  // Add preload home Hero image link tag
+ if (featuredImage) {
+   const preloadImageLink = getPreloadImageMeta({
+     url: featuredImage.url,
+   });
+   metas.push(preloadImageLink);
+ }

  // Add preload font link tag
+   const preloadFontLink = getPreloadFontMeta({
+     url: `https://fonts.googleapis.com/css2?family=Fira+Code&family=Montserrat:wght@400;500;800`
+   });
+   metas.push(preloadFontLink);

  return metas;
};
```

## One single utility to rule them all?

Perhaps we may want to consider a single unified `genHydrogenMeta` utility that encapsulates all into a "simpler" interface.

```diff
// app/routes/product.$handle.tsx

export function meta({data, matches}) {
  const metas = [];

+  return getHydrogenMeta({
+    seo: [data.seo, ...],
+    fonts: [{url: `https://fonts.googleapis.com/css2?family=Fira+Code&family=Montserrat:wght@400;500;800`}],
+    images: [{url: data.product.featuredImage.url, widths?: ....}],
+.   preconnects: [],
+    // ....
+  })
};
```

### My concerns
 - It could make this function very complex internally because of the differnt types each of the meta group would expect.
 - It could be harder to respect and visualize tags hirerchy/merging across parent layouts and routes for each different type
 - Could be perhaps more easily misused/misconfigured. Some tags such as `fonts` and `preconnects` should only be loaded at a global level (root.tsx). Sme others tags such as `seo`, should be loaded in multiple places (layout and/or routes) – specially due to ld+Json. And finally some others tags such as `images` are very specific to the route they are instanciated at and are fully dependent on the data from that specific loader.

## My Recommendation

For now, I think we should move forward with just adding the `getPreloadImageMeta`. This utility will certainly enhance core web vitals on first page load and should provide minimal gains on sub-navigations by allowing the browser to fetch images a little earlier and in parallel.




## Additional Reading

- [Preloading responsive images](https://web.dev/articles/preload-responsive-images)
- [Preload critical assets to improve loading speed](https://web.dev/articles/preload-critical-assets)

