# React Router On Oxygen

Read the core Oxygen requirements in [SKILL.md](../SKILL.md) first. This reference only maps those requirements to a
React Router framework-mode app. Adapt names and paths to the project instead of copying files blindly.

## Contents

- Package scripts and dependencies
- Vite configuration
- React Router configuration
- Worker entrypoint
- Request context
- Server and client entries
- TypeScript adjustments
- React Router verification

## Package Scripts And Dependencies

Keep the app's existing React and React Router dependencies. Keep `isbot` for bot-aware streaming. Remove
`@react-router/node`, `@react-router/serve`, and `react-router-serve` only after replacing their runtime responsibilities
with the entries below. Keep `@types/node` as a development dependency when Vite configuration needs it.

Use React Router framework-mode commands while preserving any existing GraphQL validation:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "react-router build",
    "preview": "react-router build && vite preview",
    "typecheck": "react-router typegen && tsc --noEmit",
    "deploy": "shopify hydrogen deploy"
  }
}
```

For example, retain `gql.tada check --fail-on-warn` in `typecheck` when the app uses the gql.tada plugin.

## Vite Configuration

Place the Oxygen plugin before React Router. Its order relative to unrelated plugins such as Tailwind or custom
development plugins does not matter. Merge the following settings into the existing config and keep unrelated plugins
the app needs:

```ts
import { reactRouter } from "@react-router/dev/vite";
import { oxygen } from "@shopify/mini-oxygen/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [oxygen(), reactRouter()],
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
        "react-router > set-cookie-parser",
        "react-router > cookie",
        "react-router",
      ],
    },
  },
});
```

Keep `assetsInlineLimit: 0` for a strict Content Security Policy. Keep the `optimizeDeps` list until MiniOxygen runtime
tests prove entries unnecessary; it prevents React Router development failures such as `module is not defined` and
`require is not defined`.

Do not add classic Hydrogen's Vite plugin or unrelated development plugins solely for Oxygen.

## React Router Configuration

Keep SSR enabled. Preserve existing future flags and app behavior. Middleware-based apps generally need:

```ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  subResourceIntegrity: false,
  future: {
    v8_middleware: true,
    unstable_optimizeDeps: true,
  },
} satisfies Config;
```

Do not force a new build directory unless the project's deployment tooling requires it.

Set `subResourceIntegrity: false` because Oxygen serves the assets itself and does not need React Router's SRI manifest
in the Worker output. Enable `unstable_optimizeDeps` so React Router honors Vite's `ssr.optimizeDeps.include` list under
MiniOxygen.

## Worker Entrypoint

Add the root Worker entrypoint expected by MiniOxygen. Create the React Router request handler and context per request:

```ts
import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { createAppLoadContext } from "./app/lib/server-context";

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const handleRequest = createRequestHandler(serverBuild, import.meta.env.MODE);
    const context = await createAppLoadContext(
      request,
      env,
      executionContext,
      new RouterContextProvider(),
    );

    return handleRequest(request, context);
  },
};
```

Use `import.meta.env.MODE`, not `process.env.NODE_ENV`, at this Vite boundary.

## Request Context

Map the platform values described in the main skill into React Router contexts:

```ts
import type { CacheInstance } from "@shopify/hydrogen";
import { createContext } from "react-router";
import type { RouterContextProvider } from "react-router";

export const envContext = createContext<Env>();
export const waitUntilContext = createContext<ExecutionContext["waitUntil"]>();
export const cacheContext = createContext<CacheInstance>();

export async function createAppLoadContext(
  _request: Request,
  env: Env,
  executionContext: ExecutionContext,
  provider: RouterContextProvider,
): Promise<RouterContextProvider> {
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const cache = await caches.open("hydrogen");

  provider.set(envContext, env);
  provider.set(waitUntilContext, waitUntil);
  provider.set(cacheContext, cache);
  return provider;
}
```

Adapt this to an existing `getLoadContext` or middleware architecture. Root middleware and loaders should read these
values before creating the request-scoped resources required by the main skill.

## Server And Client Entries

Provide explicit entries after removing the Node adapter. Render with Web streams:

```tsx
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import type { EntryContext } from "react-router";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
) {
  let statusCode = responseStatusCode;
  const body = await renderToReadableStream(
    <ServerRouter context={reactRouterContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error) {
        console.error(error);
        statusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get("user-agent"))) await body.allReady;
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, { headers: responseHeaders, status: statusCode });
}
```

Add the browser hydration entry:

```tsx
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
```

Do not copy entries that import classic Hydrogen CSP or nonce utilities.

## TypeScript Adjustments

Apply the Worker environment and type requirements from the main skill. Additionally include `react-router` and
`vite/client` in the app TypeScript types, preserve the existing gql.tada plugin configuration, and use `import type`
for type-only bindings under `verbatimModuleSyntax`.

## React Router Verification

Run React Router type generation, the app typecheck, GraphQL validation when configured, and `react-router build`.
Search for Node adapter remnants in application and configuration files:

```sh
rg -n 'process\.env|renderToPipeableStream|@react-router/node|@react-router/serve|react-router-serve|hydrogen-classic' \
  . -g '!node_modules' -g '!build' -g '!dist' -g '!package-lock.json' -g '!pnpm-lock.yaml'
```

Classify matches in build configuration, documentation, and transitive dependencies rather than deleting them
mechanically. Then perform the framework-neutral MiniOxygen runtime checks from the main skill.
