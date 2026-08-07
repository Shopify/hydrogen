# 1. Inspect App

## Basic Compatibility

Read `package.json` in the current directory.

If it does not exist, stop and tell the user this skill must run in a javascript application with a `package.json` at its root.

If it does not contain `@shopify/hydrogen@preview` (or a more specific hash) in its dependencies, ask the user to install it. Do not assume package managers or install for the user.

### Continue when

- [ ] Current directrory has `package.json`
- [ ] Current project includes `@shopify/hydrogen@preview` or similar in its dependencies

## Styling

Identify how the app handles styling. You must follow an already established design system or library if present. Do not introduce a new styling approach when one already exists.

Common fingerprints:

| Library | Look for |
| --- | --- |
| Tailwind CSS | `tailwind.config.*` at root; `@tailwindcss/vite` / `@tailwindcss/postcss` / `tailwindcss` in dependencies; `@import "tailwindcss"` or `@tailwind` directives in CSS; utility-heavy `className` / `class` usage |
| StyleX | `@stylexjs/stylex` in dependencies; `stylex.config.*` or StyleX Babel/SWC plugin config; `stylex.create(...)` / `stylex.props(...)` in components |
| CSS Modules | `*.module.css` / `*.module.scss` co-located with components; `import styles from '...module.css'` |
| Sass / SCSS | `sass` / `sass-embedded` in dependencies; `*.scss` / `*.sass` stylesheets |
| Panda CSS | `@pandacss/dev` / styled-system output; `panda.config.*` at root |
| UnoCSS | `unocss` in dependencies; `uno.config.*` / `unocss.config.*` at root |
| styled-components | `styled-components` in dependencies; `styled.*` / `createGlobalStyle` usage |
| Plain CSS | Global `*.css` imports with no module/utility/runtime styling library detected |

If multiple signals appear, prefer the one the app already uses for layout and components (config + component usage), not a transitive dependency alone. If none of the above match, treat the app as plain CSS / unstyled and keep new UI minimal semantic HTML.

### Continue when

- [ ] Styling approach identified (or confirmed absent)


## Framework specific references

Every skill prefixed with `hydrogen-` *may* ship a framework-specific instruction file under its own `references/`. After detecting the framework, check that skill's `references/` for the matching file and read it before making framework-specific choices. If no matching reference exists, continue from the generic instructions and follow the app's existing conventions.

Inspect dependencies, configuration files, server entry points, route directories, and existing request lifecycle code. Identify whether the app has a framework that can run server code and expose request handlers, middleware, loaders, server functions, or route handlers.

Common root-level fingerprints:

| Framework | Look for | Reference file to look for |
| --- | --- | --- |
| Astro | `astro.config.ts` / `astro.config.mjs` at root | `astro.md` |
| Next.js | `next.config.ts` / `next.config.js` / `next.config.mjs` at root | `nextjs.md` |
| React Router | `react-router.config.ts` at root | `react-router.md` |
| Nuxt | `nuxt.config.ts` / `nuxt.config.js` at root | `nuxt.md` |
| SvelteKit | `svelte.config.js` / `svelte.config.ts` at root | `sveltekit.md` |
| SolidStart | `app.config.ts` at root with `@solidjs/start` | `solidstart.md` |
| Marko | `marko.config.js` / `marko.config.ts` at root, or `@marko/run` | `marko.md` |

Do not hard block just because no reference file exists. Continue when the app has a real server request lifecycle where Hydrogen can run before routing and handle 404 redirects after routing. Stop only when the app is clearly browser-only, static-only, or has no way to run server code.

### Continue when

- [ ] Able to determine that the application serves HTTP requests