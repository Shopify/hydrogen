# Storefront E2E

Portable Playwright suite for testing an already-running Hydrogen storefront example or generated storefront.

The CI workflow runs the suite against these reference storefronts:

| Reference | Directory | Server mode |
| --- | --- | --- |
| React Router | `templates/react-router` | Vite development server |
| Next.js | `examples/nextjs` | Next.js development server |
| Nuxt | `examples/nuxt` | Production build and Node server |

Run with:

```sh
STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
```

See docs/storefront-contract.md for the required storefront contract, diagnostics, checkout boundary, and operational assumptions.
