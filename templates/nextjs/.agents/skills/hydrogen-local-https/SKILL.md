---
name: hydrogen-local-https
description: >
  Configure trusted local HTTPS for Customer Account API development with
  Vite-based frameworks or Next.js.
---

# Local HTTPS

Customer Account login, logout, and OAuth callbacks require an HTTPS, non-`localhost` origin that exactly matches the URLs registered in Shopify admin. `local.tryhydrogen.dev` is a Shopify-owned domain that resolves publicly to `127.0.0.1`, so it provides a stable local hostname.

## Certificates

The `localHttps` Vite plugin provisions missing certificates automatically when `vite dev` starts: it downloads a pinned, checksum-verified [mkcert](https://github.com/FiloSottile/mkcert) release, installs the local certificate authority (this may prompt for your password), and generates the certificate files under `~/.shopify/hydrogen/certs/`. To provision ahead of time — or for frameworks that read certificate paths before Vite starts (Nuxt, SolidStart) — run:

```sh
npx hydrogen setup https
```

Pass `certPath` and `keyPath` to use another location. When automatic download is unavailable for a platform, install mkcert manually and generate the files at the paths the warning prints.

The plugin skips automatic provisioning when the `CI` environment variable is set, because installing the certificate authority needs an interactive trust prompt. Run `npx hydrogen setup https` explicitly when a CI job genuinely needs local HTTPS.

## Vite

```ts
import { localHttps } from "@shopify/hydrogen/vite";
import { defineConfig } from "vite";

const httpsOptions = {
  enabled: process.env.npm_lifecycle_event === "dev:https",
};

export default defineConfig({
  plugins: [localHttps(httpsOptions)],
});
```

Add a `"dev:https": "vite dev"` package script and run it through the project's package manager. The normal `dev` script remains plain HTTP.

## Astro

Astro needs its own host and port in addition to the Vite plugin:

```js
import { LOCAL_HTTPS_DEFAULTS, localHttps } from "@shopify/hydrogen/vite";
import { defineConfig } from "astro/config";

const enabled = process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };

export default defineConfig({
  server: enabled
    ? { host: LOCAL_HTTPS_DEFAULTS.host, port: LOCAL_HTTPS_DEFAULTS.port }
    : undefined,
  vite: { plugins: [localHttps(httpsOptions)] },
});
```

## Nuxt

Nitro terminates TLS, so provide certificate paths to both Nitro and Vite. Nitro reads the paths when the config is evaluated, so provision certificates with `npx hydrogen setup https` (or restart once after the plugin provisions them):

```ts
import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";
import type { NuxtConfig } from "nuxt/schema";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];

const httpsOptions = {
  enabled: process.env.npm_lifecycle_event === "dev:https",
};

export default defineNuxtConfig({
  devServer: localHttpsDevServer(httpsOptions),
  vite: {
    plugins: [localHttps(httpsOptions) as VitePlugin],
  },
});
```

## SolidStart/Vinxi

Vinxi terminates TLS outside Vite and reads certificate paths when the config is evaluated, so provision certificates with `npx hydrogen setup https` (or restart once after the plugin provisions them):

```ts
import { defineConfig } from "@solidjs/start/config";
import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";

const httpsOptions = {
  enabled: process.env.npm_lifecycle_event === "dev:https",
};
const devServer = localHttpsDevServer(httpsOptions);

export default defineConfig({
  server: { https: devServer?.https },
  vite: { plugins: [localHttps(httpsOptions)] },
});
```

Vinxi also needs its bind target and port on startup:

```sh
npm run dev:https
```

## Next.js

Next.js provisions its own trusted certificate:

```sh
next dev --experimental-https --hostname local.tryhydrogen.dev --port 5173
```

## Shopify Admin

Outside CI, the `localHttps` Vite plugin uses the installed Shopify CLI to update Customer Account API settings when the server starts. Shopify CLI must include `@shopify/cli-hydrogen` 13.0.4 or later. If the project is not linked to a Hydrogen storefront, Shopify CLI starts the interactive linking flow before it pushes the callback, JavaScript origin, and logout URLs.

The plugin skips Shopify CLI in CI. It also falls back without stopping the development server when Shopify CLI is missing or outdated, linking is cancelled, or the settings cannot be pushed. In these cases, configure the values printed in the terminal manually.

Next.js does not use the Vite plugin, so configure its values manually too.

### Manual Configuration

In the Hydrogen or Headless sales channel, open the storefront's **Customer Account API settings** and configure:

```text
Callback URI(s):       https://local.tryhydrogen.dev:5173/account/authorize
JavaScript origin(s):  https://local.tryhydrogen.dev
Logout URI:            https://local.tryhydrogen.dev:5173
```

The JavaScript origin intentionally has no port. Shopify's server-side validation rejects JavaScript origins containing a port.
