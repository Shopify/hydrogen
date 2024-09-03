# Hydrogen example: Sitemaps

This example contains a preview implementation of sitemap queries available in the unstable version of the Storefront API.

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template sitemap
```

## Key files

This folder contains the minimal set of files needed to showcase the implementation.
Files that aren’t included by default with Hydrogen and that you’ll need to
create are labeled with 🆕.

| File                                                                          | Description                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`app/routes/[sitemap.xml].tsx`](app/routes/[sitemap.xml].tsx)                | A sitemap index route which links to sitemaps for each resource type |
| [`app/routes/sitemap.$type.$page[.xml].tsx` 🆕](app/routes/[sitemap.xml].tsx) | A child sitemap for each resource type                               |

## Instructions

### 1. Link your store to inject the required environment variables

```bash
npx shopify hydrogen link
```

### 2. Configure supported locales

Update the available locales for your app inside `app/routes/sitemap.$type.$page[.xml].tsx`. Also upate the `getLink` function to properly produce URLs for each type of resource.

### 3. Update `Cache-Control`

Update the `Cache-Control` headers if you'd like to customize how the sitemap is cached.
