---
'@shopify/hydrogen-react': patch
---

Adds a new `Image` component, replacing the existing one. The new component is backwards compatible, but deprecates some props and benefits from some breaking changes.

### Migrating to the new `Image`

The new `Image` component is responsive by default, and requires less configuration to ensure the right image size is being rendered on all screen sizes.

**Before**

```jsx
<Image
  data={image}
  widths={[400, 800, 1200]}
  width="100px"
  sizes="90vw"
  loaderOptions={{
    scale: 2,
    crop: 'left',
  }}
/>
```

**After**

```jsx
<Image data={image} sizes="90vw" crop="left" aspectRatio="3/2" />
```

Note that `widths` and `loaderOptions` have now been deprecated, declaring `width` is no longer necessary, and we’ve added an `aspectRatio` prop:

- `widths` is now calculated automatically based on a new `srcSetOptions` prop (see below for details).
- `loaderOptions` has been removed in favour of declaring `crop` and `src` as props. `width` and `height` should only be set as props if rendered a fixed image size, and otherwise default to `100%` and `auto` respectively, with the loader calculating each dynamically.
- `aspectRatio` is calculated automatically using `data.width` and `data.height` (if available) — but if you want to present an image with an aspect ratio other than what was uploaded, you can set using the format `Int/Int` (e.g. `3/2`, [see MDN docs for more info](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio)); if you've set an `aspectRatio`, we will default the crop to be `crop: center` (in the example above we've specified this to use `left` instead).

### Examples

<!-- Simplest possible usage -->

#### Basic Usage

```jsx
<Image data={data} />
```

This would use all default props, which if exhaustively declared would be the same as typing:

```jsx
<Image
  data={data}
  crop="center"
  decoding="async"
  loading="lazy"
  width="100%"
  height="auto"
  sizes="100vw"
  srcSetOptions={{
    interval: 15,
    startingWidth: 200,
    incrementSize: 200,
    placeholderWidth: 100,
  }}
/>
```

An alternative way to write this without using `data` would be to use the `src`, `alt`, and `aspectRatio` props. For example:

```jsx
<Image
  src={data.url}
  alt={data.altText}
  aspectRatio={`${data.width}/${data.height}`}
/>
```

Assuming `data` had the following shape:

```json
{
  url: "https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg",
  altText: "alt text",
  width: "4000"
  height: "4000"
}
```

All three above examples would result in the following HTML:

```html
<img
  srcset="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=300&height=300&crop=center 300w, … *13 additional sizes* … https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=3000&height=3000&crop=center 3000w"
  src="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=100&height=100&crop=center"
  alt="alt text"
  sizes="100vw"
  loading="lazy"
  decoding="async"
  width="100px"
  height="100px"
  style="aspect-ratio: 4000 / 4000;"
/>
```

#### Fixed-size Images

When using images that are meant to be a fixed size, like showing a preview image of a product in the cart, instead of using `aspectRatio`, you'll instead declare `width` and `height` manually with fixed values. For example:

```jsx
<Image data={data} width={80} height={80} />
```

Instead of generating 15 images for a broad range of screen sizes, `Image` will instead only generate 3, for various screen pixel densities. The above example would result in the following HTML:

```html
<img
  srcset="
    https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=80&height=80&crop=center   1x,
    https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=160&height=160&crop=center 2x,
    https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=240&height=240&crop=center 3x
  "
  src="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=80&height=80"
  alt="alt text"
  loading="lazy"
  width="80px"
  height="80px"
  style="aspect-ratio: 80 / 80;"
/>
```

If you don't want to have a fixed aspect ratio, and instead respect whatever is returned from your query, the following syntax can also be used:

```jsx
<Image data={data} width="5rem" />
```

Which would result in the same HTML as above, however the generated URLs would not have `height` or `crop` parameters appended to them, and the generated `aspect-ratio` in `style` would be `4000 / 4000` (if using the same `data` values as our original example).

#### Custom Loaders

If your image isn't coming from the Storefront API, but you still want to take advantage of the `Image` component, you can pass a custom `loader` prop, provided the CDN you're working with supports URL-based transformations.

The `loader` is a function which expects a `params` argument of the following type:

```ts
type LoaderParams = {
  /** The base URL of the image */
  src?: ImageType['url'];
  /** The URL param that controls width */
  width?: number;
  /** The URL param that controls height */
  height?: number;
  /** The URL param that controls the cropping region */
  crop?: Crop;
};
```

Here is an example of using `Image` with a custom loader function:

```jsx
const customLoader = ({src, width, height, crop}) => {
  return `${src}?w=${width}&h=${height}&gravity=${crop}`;
};

export default function CustomImage(props) {
  <Image loader={customLoader} {...props} />;
}

// In Use:

<CustomImage data={customCDNImageData} />;
```

If your CDN happens to support the same semantics as Shopify (URL params of `width`, `height`, and `crop`) — the default loader will work a non-Shopify `src` attribute.

An example output might look like: `https://mycdn.com/image.jpeg?width=100&height=100&crop=center`

### Additional changes

- Added the `srcSetOptions` prop used to create the image URLs used in `srcset`. It’s an object with the following keys and defaults:

  ```js
  srcSetOptions = {
    intervals: 15, // The number of sizes to generate
    startingWidth: 200, // The smalles image size
    incrementSize: 200, // The increment by to increase for each size, in pixesl
    placeholderWidth: 100, // The size used for placeholder fallback images
  };
  ```

- Added an export for `IMAGE_FRAGMENT`, which can be imported from Hydrogen and used in any Storefront API query, which will fetch the required fields needed by the component.

- Added an export for `shopifyLoader` for using Storefront API responses in conjunction with alternative frameworks that already have their own `Image` component, like Next.js
