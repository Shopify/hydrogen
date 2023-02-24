# Hydrogen v2 on Cloudflare edge

- [Hydrogen Docs](https://shopify.dev/docs/custom-storefronts/hydrogen)
- [Remix Docs](https://remix.run/docs)

## Install

```sh
npm install --legacy-peer-deps
```

Peer deps should get updated soon in Hydrogen

## Development

You will be running two processes during development:

- The Miniflare server (miniflare is a local environment for Cloudflare Workers)
- The Remix development server

Both are started with one command:

```sh
npm run dev
```

Open up [http://127.0.0.1:8787](http://127.0.0.1:8787) and you should be ready to go!

If you want to check the production build, you can stop the dev server and run following commands:

```sh
npm run build
npm start
```

Then refresh the same URL in your browser (no live reload for production builds).

## Setup your store

Add your store environment variables to the `wrangler.toml` file. For production secret keys follow [cloudflare's guide](https://developers.cloudflare.com/workers/platform/environment-variables/#add-secrets-to-your-project)

## Deployment

If you don't already have an account, then [create a cloudflare account here](https://dash.cloudflare.com/sign-up) and after verifying your email address with Cloudflare, go to your dashboard and set up your free custom Cloudflare Workers subdomain.

Once that's done, you should be able to deploy your app:

```sh
npm run deploy
```
