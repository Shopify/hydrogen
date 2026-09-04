# Documentation Dependencies

## Hydrogen Cart Store API

When changing the cart store's public surface (`CartStore`, React/Vue `createCartComponents` outputs, or the cart action hooks/composables), update these together:

- `packages/hydrogen/src/core/cart/cart.ts`
- `packages/hydrogen/src/react/cart.tsx` and `packages/hydrogen/src/react/index.ts`
- `packages/hydrogen/src/vue/cart.ts` and `packages/hydrogen/src/vue/index.ts`
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md`
- `packages/hydrogen/skills/hydrogen-cart-ui/references/react.md`
- `packages/hydrogen/skills/hydrogen-cart-ui/references/vue.md`

## Hydrogen Cart Metafields

When changing the cart metafields pattern (app-owned metafield route, custom `CartFragment` reads, or the mutate-then-`refresh()` flow), update these together:

- `examples/hydrogen/app/lib/cart-metafields.server.ts` (app-owned route)
- `examples/hydrogen/app/lib/cart-handlers.ts` (`CartFragment` reads)
- `examples/hydrogen/app/components/CartDeliveryInstructions.tsx` (client)
- `packages/hydrogen/skills/hydrogen-cart-metafields/SKILL.md`
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md` (cross-reference)

## Hydrogen Local HTTPS

When changing `@shopify/hydrogen/vite` local HTTPS behaviour, update these together:

- `packages/hydrogen/src/vite/*`
- `packages/hydrogen/skills/hydrogen-local-https/SKILL.md`
- `templates/react-router/README.md`
- `templates/react-router/package.json`
- `templates/react-router/vite.config.ts`
- framework example `dev:https` scripts and configs under `examples/*`

`scripts/preview-template-dist.ts` copies `packages/hydrogen/skills` into template `.agents/skills` when preparing the dist branch, so template source directories should not duplicate those generated skill copies.
