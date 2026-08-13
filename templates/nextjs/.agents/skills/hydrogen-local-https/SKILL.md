---
name: hydrogen-local-https
description: >
  Configure trusted local HTTPS for Customer Account API development with
  Vite-based frameworks or Next.js.
---

# Local HTTPS

Customer Account login, logout, and OAuth callbacks require an HTTPS, non-`localhost` origin that exactly matches the URLs registered in Shopify admin. `local.tryhydrogen.dev` is a Shopify-owned domain that resolves publicly to `127.0.0.1`, so it provides a stable local hostname.

## Vite Certificate Setup

Vite-based frameworks need manual certificates until automatic provisioning is available. Install and trust [mkcert](https://github.com/FiloSottile/mkcert), then create the default certificate files:

```sh
brew install mkcert
mkcert -install
mkdir -p ~/.shopify/hydrogen/certs
mkcert \
  -cert-file ~/.shopify/hydrogen/certs/local.tryhydrogen.dev.pem \
  -key-file ~/.shopify/hydrogen/certs/local.tryhydrogen.dev-key.pem \
  local.tryhydrogen.dev
```

Pass `certPath` and `keyPath` to use another location. Certificate generation is intentionally separate from the plugin.

## Vite

```ts
import { localHttps } from "@shopify/hydrogen/vite";
import { defineConfig } from "vite";

const httpsOptions = {
  enabled: process.env.VITE_LOCAL_HTTPS === "1",
};

export default defineConfig({
  plugins: [localHttps(httpsOptions)],
});
```

Start Vite with `VITE_LOCAL_HTTPS=1 vite dev`. A normal `vite dev` remains plain HTTP.

## Astro

Astro needs its own host and port in addition to the Vite plugin:

```js
import { LOCAL_HTTPS_DEFAULTS, localHttps } from "@shopify/hydrogen/vite";
import { defineConfig } from "astro/config";

const enabled = process.env.VITE_LOCAL_HTTPS === "1";
const httpsOptions = { enabled };

export default defineConfig({
  server: enabled
    ? { host: LOCAL_HTTPS_DEFAULTS.host, port: LOCAL_HTTPS_DEFAULTS.port }
    : undefined,
  vite: { plugins: [localHttps(httpsOptions)] },
});
```

## Nuxt

Nitro terminates TLS, so provide certificate paths to both Nitro and Vite:

```ts
import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";
import type { NuxtConfig } from "nuxt/schema";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];

const httpsOptions = {
  enabled: process.env.VITE_LOCAL_HTTPS === "1",
};

export default defineNuxtConfig({
  devServer: localHttpsDevServer(httpsOptions),
  vite: {
    plugins: [localHttps(httpsOptions) as VitePlugin],
  },
});
```

## SolidStart/Vinxi

Vinxi terminates TLS outside Vite:

```ts
import { defineConfig } from "@solidjs/start/config";
import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";

const httpsOptions = {
  enabled: process.env.VITE_LOCAL_HTTPS === "1",
};
const devServer = localHttpsDevServer(httpsOptions);

export default defineConfig({
  server: { https: devServer?.https },
  vite: { plugins: [localHttps(httpsOptions)] },
});
```

Vinxi also needs its bind target and port on startup:

```sh
VITE_LOCAL_HTTPS=1 HOST=local.tryhydrogen.dev vinxi dev --port 5173
```

## Next.js

Next.js provisions its own trusted certificate:

```sh
next dev --experimental-https --hostname local.tryhydrogen.dev --port 5173
```

## Shopify Admin

In the Hydrogen or Headless sales channel, open the storefront's **Customer Account API settings** and configure:

```text
Callback URI(s):       https://local.tryhydrogen.dev:5173/account/authorize
JavaScript origin(s):  https://local.tryhydrogen.dev
Logout URI:            https://local.tryhydrogen.dev:5173
```

The JavaScript origin intentionally has no port. Shopify's server-side validation rejects JavaScript origins containing a port.
