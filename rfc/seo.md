# SEO

A large part of good SEO depends on the proper `meta` and `link` tags present in the `head` tag as well as a well-defined object of JSON Linking Data (JSON-LD) inside of a `script` tag with type `"application/ld+json"`. In addition to the HTML standard metadata, the combination of these elements support a range of protocols and applications, namely Open Graph, Twitter and Bots (aka crawlers).

Remix offers a great API to control the output of `meta` and `link` tags as part of its standard library. These primitives may work for some, but it relies on the user to know the most optimal grouping of tags for each route to best communicate the contents of the page to search engines and other applications.

Instead we can paper-over these nitty (and ever-evolving/changing) details, and exposing a simpler interface and sensible defaults that work for most Hydrogen storefronts.

## Usage

The SEO components added by Hydrogen follows a common pattern of rendering a component at the route that collects data defined in the `handle` export of route modules.

First, render the `Seo` component in the app `root` component.

```tsx
// app/root.tsx
import {Seo} from `@hydrogen/seo`; // hypothetical package name

export default function App() {
  return (
    <html lang="en">
      <head>
        <Seo /> // <- Render inside the header before the Meta and Links components
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

With this component now in the document, each `route` module can now define an `seo` object inside of the `handle` export. For example:

```ts
export const handle = {
  seo: {
    //... Add SEO information here
  },
};
```

This object is of type `SeoDescriptor` which is an interface with the following fields.

## `SeoDescriptor` fields

| Property        | Type               | Default               | Description                                                              | Example           |
| --------------- | ------------------ | --------------------- | ------------------------------------------------------------------------ | ----------------- |
| `titleTemplate` | `string`           |                       | Sets a template string where `%s` are replaced with the `title` property | `"%s ~ Hydrogen"` |
| `title`         | `string`           |                       | Sets the title of the page                                               |                   |
| `defaultTitle`  | `string`           |                       | Used if the `title` field is empty                                       |                   |
| `noindex`       | `boolean`          | false                 | If the page be indexed                                                   |                   |
| `nofollow`      | `boolean`          | false                 | If the page be followed                                                  |                   |
| `url`           | `string`           |                       | The canonical url of the page                                            |                   |
| `twitter`       | `TwitterOptions`   |                       | The Twitter specific overrides                                           |                   |
| `openGraph`     | `OpenGraphOptions` |                       | The Open Graph specific overrides                                        |                   |
| `images`        | `Image[]`          |                       | Array of image data for share previews                                   |                   |
| `alternates`    | `(MobileAlternate  | LanguageAlternate)[]` | Specify relations to mobile or alternate language versions               |                   |

### `TwitterOptions` fields

| Property      | Type     | Default                     | Description                                                                      | Example |
| ------------- | -------- | --------------------------- | -------------------------------------------------------------------------------- | ------- |
| `type`        | `string` | `summary_large_image`       | The card type, which will be one of summary, summary_large_image, app, or player |         |
| `site`        | `string` | `SeoDescriptor.site`        | @username for the website used in the card footer                                |         |
| `handle`      | `string` |                             | @username for the content creator / author (outputs as twitter:creator)          |         |
| `description` | `string` | `SeoDescriptor.description` |                                                                                  |         |
| `title`       | `string` | `SeoDescriptor.title`       |                                                                                  |         |

### `OpenGraphOptions` fields

| Property      | Type     | Default                     | Description | Example |
| ------------- | -------- | --------------------------- | ----------- | ------- |
| `url`         | `string` | `SeoDescriptor.url`         |             |         |
| `type`        | `string` |                             |             |         |
| `title`       | `string` | `SeoDescriptor.title`       |             |         |
| `description` | `string` | `SeoDescriptor.description` |             |         |
| `siteName`    | `string` | `SeoDescriptor.title`       |             |         |
| `locale`      | `string` |                             |             |         |

#### `OpenGraphProfileOptions` fields

| Property    | Type     | Default | Description          | Example |
| ----------- | -------- | ------- | -------------------- | ------- |
| `firstName` | `string` |         | Person's first name. |         |
| `lastName`  | `string` |         | Person's last name.  |         |
| `username`  | `string` |         | Person's username.   |         |
| `gender`    | `string` |         | Person's gender.     |         |

### `OpenGraphArticleOptions` fields

| Property         | Type       | Default                  | Description                             | Example |
| ---------------- | ---------- | ------------------------ | --------------------------------------- | ------- |
| `publishedTime`  | `datetime` |                          | When the article was first published.   |         |
| `modifiedTime`   | `datetime` |                          | When the article was last changed.      |         |
| `expirationTime` | `datetime` |                          | When the article is out of date after.  |         |
| `authors`        | `string[]` |                          | Writers of the article.                 |         |
| `section`        | `string`   |                          | A high-level section name.              |         |
| `tags`           | `string`   | `SeoDescriptor.keywords` | Tag words associated with this article. |         |
|                  |

### `ImageOptions` fields

| Property | Type     | Default | Description | Example |
| -------- | -------- | ------- | ----------- | ------- |
| `url`    | `string` |         |             |         |
| `height` | `number` |         |             |         |
| `width`  | `number` |         |             |         |
| `alt`    | `string` |         |             |         |

### `RobotsOptions` fields

| Property            | Type      | Default | Description                                                                                                                                                                                     | Example |
| ------------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `noarchive`         | `boolean` |         | Requests the search engine not to cache the page content.                                                                                                                                       |         |
| `nosnippet`         | `boolean` |         | Prevents displaying any description of the page in search engine results.                                                                                                                       |         |
| `maxSnippet`        | `number`  |         | Use a maximum of [number] characters as a textual snippet for this search result.                                                                                                               |         |
| `unavailable_after` | `string`  |         | Do not show this page in search results after the specified date/time. The date/time must be specified in a widely adopted format including, but not limited to RFC 822, RFC 850, and ISO 8601. |

### `ImageOptions` fields

| Property  | Type     | Default | Description | Example |
| --------- | -------- | ------- | ----------- | ------- |
| `url`     | `string` |         |             |         |
| `height`  | `number` |         |             |         |
| `width`   | `number` |         |             |         |
| `altText` | `string` |         |             |

### `AlternateOptions` fields

| Property | Type     | Default | Description                              | Example                              |
| -------- | -------- | ------- | ---------------------------------------- | ------------------------------------ |
| `url`    | `string` |         | URL to alternate                         |                                      |
| `media`  | `string` |         | Media query for alternate mobile version | `only screen and (max-width: 640px)` |
| `lang`   | `string` |         | Language code of alternate               | `DE-BE`                              |

## Examples

TBD

## Additional tooling

In order to prevent common pitfals when configuring SEO, we provide the following tooling to provide diagnostic information and helpful warnings.

### Lint rules

We provide a lint rule inside of the `eslint-plugin-hydrogen` package that warns for missing SeoDescriptors on routes.

### Debug panel

We also provide an in-browser debug panel for SEO information that displays the following information to help debug common pitfalls:

- Current route modules matched that are influencing the SEO data for the current path
- The resolved configuration based on the previous point
- The final rendered HTML output, broken into categories.

In order to view the debug panel, you need to render the Debugger component in your root module. It is best to put this just before the closing body tag.

```tsx
// app/root.tsx
import {Seo, Debugger} from `@hydrogen/seo`; // hypothetical package name

export default function App() {
  return (
    <html lang="en">
      <head>
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Debugger />  // <- Render before the closing `body` tag
      </body>
    </html>
  );
}
```

### E2e tests

We ship the store with a suite of basic E2e tests to check the page renders with the correct metatags at various routes.

### Dynamic OG-Images

TBD

## Appendix

- [SEO in the Storefront API](https://shopify.dev/api/storefront/2022-10/objects/seo)
- [Alternate API](https://v3.nuxtjs.org/guide/concepts/rendering/#route-rules)
