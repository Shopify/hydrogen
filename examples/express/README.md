# Hydrogen Express Example

This is a Hydrogen example using NodeJS [Express](https://expressjs.com/). Hydrogen works best with Oxygen, and any project initialized with `npm create @shopify/hydrogen@latest` will create a template that uses Oxygen. If you don't want to use Oxygen, adapting the starter template to another platform is tricky. Instead we suggest generating a new app from the [Remix CLI](https://remix.run/docs/en/1.16.1/tutorials/blog) `npx create-remix@latest` and adapting it with Hydrogen functionality.

This is an example setup where we have adapted the Remix Express starter app to use Hydrogen. A few things are not yet functional:

1. The app only uses an in-memory cache implementation. In production, you probably would want to use redis, memcached, or another cache implementation. Just make sure any custom cache implements the [Cache interface](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
1. The app does not yet utilize [`storefrontRedirect`](https://shopify.dev/docs/api/hydrogen/2023-04/unstable/utilities/storefrontredirect). This will be added when Remix releases middleware.
1. The app only includes a single index route. If you'd like to add more routes, run the Shopify CLI: `npx shopify hydrogen generate route`

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template express
```

## Setup

Start the Remix development asset server and the Express server by running:

```sh
npm run dev
```

This starts your app in development mode, which will purge the server require cache when Remix rebuilds assets so you don't need a process manager restarting the express server.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying express applications you should be right at home just make sure to deploy the output of `remix build`

- `build/`
- `public/build/`
