# Navbar

Create or update the shared site navigation after the home page, cart route, and cart drawer shape are known.

## Requirements

- Preserve the app's existing layout component and styling conventions.
- Add a home link to `/`.
- Add a cart link to `/cart` as the server-rendered and no-JS fallback.
- When the cart drawer is configured, follow the local `hydrogen-cart-drawer` skill's trigger pattern so the fallback link hydrates to a drawer-opening button.
- Use the framework's native link component when one is already used in the app.
- Keep the navbar server-renderable unless the app already uses a client-only navigation shell.
- Do not fetch cart contents just to render the navbar. A static cart link is enough for setup.

## Placement

- Next.js App Router: update the root layout or existing header component under `app/`.
- React Router framework mode: update `app/root.tsx` or the existing layout route.
- SvelteKit: update `src/routes/+layout.svelte` or the existing header component.
- Astro: update the shared layout under `src/layouts/` or existing header component.
- SolidStart: update the root route/layout or existing navigation component.

## Verify

- The home link navigates to `/`.
- The cart link navigates to `/cart` before hydration or without JavaScript.
- When the cart drawer is configured, the hydrated cart trigger opens the drawer.
- The navbar appears on the home and cart routes.
- Existing navigation items and styling are not removed unless they directly conflict with the setup.
