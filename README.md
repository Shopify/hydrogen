# Hydrogen on Remix, Demo Store

[Hydrogen 2.0 Gameplan Doc](https://docs.google.com/document/d/1iEerwYgs30rVDJi5JbfxCJf2K-boAwGOODmDFCNQDmY/edit#)

[Github Project for Demo Store](https://github.com/orgs/Shopify/projects/5093/views/2)

## Milestones:

1. [ ] Rebuild the [Hydrogen Demo](https://hydrogen.shop/) store on a barebones, Vanilla version of Remix.
2. [ ] Break down code into the roadmap for "glue layer" and Hydrogen UI
3. [ ] Create list of what mental models and code patterns have changed, and what functionality is no longer possible that we should de-risk with existing merchants (e.g. server routing).


## Principles:
- Start with the unknowns, and areas where we think patterns may be different. Copy/pasting markup is easy and can be done at the end.
- Do not over engineer; our demo store is used as a quick reference for Developers. DRYing up code in a way that makes the trail hard to follow for unfamiliar developers is an anti-pattern.
- Keep as close to existing Demo Store as possible, without breaking Remix best practices

---

# Welcome to Remix!

- [Remix Docs](https://remix.run/docs)

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

## Deployment

If you don't already have an account, then [create a cloudflare account here](https://dash.cloudflare.com/sign-up) and after verifying your email address with Cloudflare, go to your dashboard and set up your free custom Cloudflare Workers subdomain.

Once that's done, you should be able to deploy your app:

```sh
npm run deploy
```
