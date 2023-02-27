# Hydrogen on Cloudflare Pages

A template to try out Hydrogen and Remix's new dev server + HMR on Cloudflare Pages

based on https://github.com/jacob-ebey/remix-cf-pages-template-hmr

## Getting started

**Install dependencies:**

```sh
yarn install
```

You must use yarn at the moment or configure overrides for conflicts on @cloudflare/workers-types.

**Start in development mode with HMR:**

```sh
yarn dev
```

Visit http://localhost:3000/

## Deployment

- Point a new Cloudflare Pages project at your repository
- Configure the build command to be `yarn build`
- Configure the build output directory to be `public`
