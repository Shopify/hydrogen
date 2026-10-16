# Storefront E2E

Portable Playwright suite for testing an already-running Hydrogen storefront example or generated storefront.

The CI workflow configures the suite for these reference storefronts:

| Reference | Directory | Server mode |
| --- | --- | --- |
| React Router | `templates/react-router` | Vite development server |
| Next.js | `examples/nextjs` | Next.js development server |
| Nuxt | `examples/nuxt` | Production build and Node server |

Run all commands from the repository root. For an already-running storefront:

```sh
STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
```

Start and configure the storefront separately before running the suite.

See the [storefront contract](docs/storefront-contract.md) for requirements and behavior.
