# Hydrogen template: Classic Remix

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen and the [Classic Remix Compiler](https://remix.run/docs/en/main/future/vite#classic-remix-compiler-vs-remix-vite) (i.e. the compiler that uses ESBuild via `@remix-run/dev`, used before Remix Vite).

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

```bash
npm create @shopify/hydrogen@latest -- --template classic-remix
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```
