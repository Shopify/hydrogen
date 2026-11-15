# Content Security Policy

Call `const csp = createContentSecurityPolicy({shop})` before rendering a document. Pass `csp.nonce` to the framework renderer, framework script components, and `ShopifyScripts` (or the core script-tag helpers). Call `csp.applyResponseHeaders(response.headers)` to send the policy and prevent caching of nonce-bearing HTML. CSP is independent of Shopify request contexts; apply it only to responses that need the policy.

Each call creates a fresh policy. Reuse that object throughout one document response; applying it repeatedly is safe and overwrites any existing enforcing CSP. The policy also exposes `header` for framework-native configuration or forwarding to a separate renderer. A stable policy created with `nonce: false` can accompany cached HTML.

Keep the normal `requestContext.applyResponseHeaders(response.headers)` call for Shopify cookies and personalized-response caching. It and `csp.applyResponseHeaders()` can run in either order; neither undoes the other's cache restrictions. Commit session cookies before applying the request-context headers.

## Customization

`directives` arrays extend defaults, as in classic Hydrogen. Custom sources come first and duplicate sources are removed. If a default consists only of `'none'`, the supplied array replaces it, so `frameAncestors: ["'self'"]` works without combining incompatible sources. `null` omits a directive; `undefined` retains its default. An empty array adds no sources to ordinary defaults. In nonce mode, the nonce is always included in `scriptSrc` and, when configured, `scriptSrcElem`, so these directives cannot contain `'none'`. Don't put nonce tokens in directive arrays; the creator owns nonce generation. Defaults allow inline styles for storefront components, but not inline script execution, event handlers, or script evaluation.

Pass only the additional sources your app needs:

```ts
const csp = createContentSecurityPolicy({
  shop,
  directives: {
    connectSrc: ['https://analytics.example.com'],
  },
});
// Render using csp.nonce, then apply the document policy.
csp.applyResponseHeaders(response.headers);
```

`getShopifyCspDirectives(shop)` supplies the same defaults used by the creator, including development connections, for framework-native CSP configuration. Adapt its camelCase directive names and quoted source keywords to the framework's format. It does not generate nonces or authorize inline scripts by default. Pass `getShopifyCspDirectives(shop, { hashes: true })` to include the [Shopify bootstrap hashes](#shopify-bootstrap-hashes) in `scriptSrc`. For frameworks with a separate hashes field that expects unquoted values, use `getShopifyScriptHashes({ quoted: false })` instead. Use framework-native configuration or construct your own header when you need exact replacement of the creator's defaults, such as removing its inline-style allowance.

Hydrogen's development build automatically adds local HTTP/HTTPS and WebSocket connections for `localhost` and `127.0.0.1`, plus WebSocket connections for `*.tryhydrogen.dev`, to the getter's `connectSrc` defaults. The creator inherits these defaults. The production build omits these sources. For framework config files loaded directly by Node, add `--conditions=development` to the Node command in development scripts; keep build and production commands without that flag. Custom `connectSrc` arrays retain these development defaults. Add other development origins explicitly, and add `'unsafe-eval'` to `scriptSrc` only if the framework's development runtime requires it. Keep framework-specific development allowances out of production. Add third-party resources and their network endpoints to the appropriate directives. Verify enabled Shopify features and third-party integrations with browser CSP enforcement active.

## Migrating from classic Hydrogen

Source arrays extend defaults in both versions, but the creator is not a drop-in replacement:

| Area | Classic | Current API |
| --- | --- | --- |
| Options | Directives are top-level properties alongside `shop`. | Move directive properties under `directives`; keep `shop` alongside `nonce`. |
| Directive values | Accepts arrays, strings, and booleans. | Source directives accept arrays or `null`; use `null` to omit. `[]` adds nothing to existing defaults, and gives an empty directive only where there is no default or the default is only `'none'`. Booleans are only for `upgradeInsecureRequests`. |
| Default policy | Relies on `defaultSrc` for scripts, images, fonts, media, and frames. | Uses `defaultSrc: ["'self'"]` and defines these directives separately, adds `objectSrc: ["'none'"]` and `scriptSrcAttr: ["'none'"]`, allows `data:` images, and adds Shopify connection/frame origins. A `defaultSrc` customization no longer authorizes these separately configured resource types. |
| Nonce placement | Adds the nonce to `scriptSrc` when an array is supplied, otherwise to `defaultSrc`. | Always adds it to `scriptSrc`, and also to a configured `scriptSrcElem`. Incoming headers never determine the nonce; manually supplied nonce sources are rejected. |
| React helpers | Returns a bound `NonceProvider`; exports `useNonce` and `Script`. | Exposes `nonce` and `header`; React context stays in the app. Pass the nonce explicitly to framework scripts and `ShopifyScripts`. |
| Response lifecycle | The app applies the returned header. | The policy owns `applyResponseHeaders()`, which overwrites existing enforcing CSP and prevents nonce reuse through caching. `nonce: false` supports cached documents. |
| Development | Checks runtime `NODE_ENV`; adds localhost to style, default, and connection sources. | Uses the package's development export; adds local origins only to connection sources, including secure WebSockets. |

The current directive type adds `scriptSrcAttr`, `styleSrcElem`, and `styleSrcAttr`; it does not include classic's `pluginTypes`, `prefetchSrc`, `navigateTo`, or `blockAllMixedContent`. Malformed source tokens and contradictory `'none'` combinations throw instead of being passed through. Shop domains accept the same values as the storefront client: bare hosts get `https://`, and trailing slashes are removed. Nonces remain 128-bit random values, now encoded as base64 instead of hexadecimal; Web Crypto is required, with no `Math.random()` fallback. Treat the nonce as an opaque string.

## CSP without nonces

Use `nonce: false` for a stable policy that can accompany cached HTML or a prerendered shell. This returns `nonce: undefined`, adds no nonce sources, and leaves cache headers unchanged. The request context's normal cookie and personalization rules still apply.

Inline scripts still need authorization. For a policy that permits inline scripts while restricting external origins, opt in explicitly:

```ts
const csp = createContentSecurityPolicy({
  shop,
  nonce: false,
  directives: {
    scriptSrc: ["'unsafe-inline'"],
  },
});
csp.applyResponseHeaders(response.headers);
```

This allows injected inline JavaScript as well as the app's scripts. Hash-based CSP is a stricter alternative, but the framework must authorize every emitted inline script, including [Shopify's bootstraps](#shopify-bootstrap-hashes). If `scriptSrcElem` is configured, it controls script elements instead of `scriptSrc`. Adding nonce/hash sources or `'strict-dynamic'` can make browsers ignore `'unsafe-inline'`; do not mix these without accounting for all inline scripts.

## Shopify bootstrap hashes

`ShopifyScripts` and the core tag helpers render static inline JavaScript with dynamic configuration in escaped `data-config` attributes. To authorize those bootstraps without nonces, add the sources returned by `getShopifyScriptHashes()` to `scriptSrc`:

```ts
const csp = createContentSecurityPolicy({
  shop,
  nonce: false,
  directives: { scriptSrc: getShopifyScriptHashes() },
});
```

These hashes are generated from the packaged script contents and include CSP quotes by default. Pass `getShopifyScriptHashes({ quoted: false })` for framework-native configurations that expect unquoted hashes. They authorize only Hydrogen's inline bootstraps; the framework must also authorize its own scripts. Hashes are opt-in because adding them causes browsers to ignore `'unsafe-inline'` in the same directive. Read the hashes from the installed package instead of copying literal hashes, and preserve the script text when rendering.

Prefer per-response nonces when the framework supports them: they authorize individual script elements for each response. Hashes authorize matching script code regardless of its `data-config` attributes.

## Next.js App Router

For a prerendered shell, use the `'unsafe-inline'` configuration from [CSP without nonces](#csp-without-nonces) in `proxy.ts`, after handling Hydrogen-owned routes. Delete `Content-Security-Policy` and `Content-Security-Policy-Report-Only` from the headers returned by `getForwardedRequestHeaders()` so a client-supplied policy cannot supply Next's nonce. Render `ShopifyScripts` without a nonce and avoid reading request headers solely for CSP in the layout. This preserves the shell's rendering model. See [Next's CSP guide](https://nextjs.org/docs/app/guides/content-security-policy).

Nonce CSP requires dynamic document rendering. Next cannot nonce scripts in a prerendered shell; putting only `ShopifyScripts` under Suspense does not solve this. Data can remain cached independently of the document.

For dynamic documents, create one policy with `createContentSecurityPolicy({shop})` in the proxy after handling Hydrogen-owned routes. Set `Content-Security-Policy` to `csp.header` on the request headers returned by `getForwardedRequestHeaders()` so Next can nonce its own scripts. Also forward `csp.nonce` in an app-owned request header such as `x-nonce`, then read that header in the dynamic layout and pass it to `ShopifyScripts`. Apply the response headers with `requestContext.applyResponseHeaders(response.headers)` followed by `csp.applyResponseHeaders(response.headers)`. See [Next's CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) for the proxy and layout pattern.

The proxy must overwrite both forwarded headers on every document-rendering path, including error pages. Incoming header values are not trusted nonce sources. Do not call the creator again in the layout: that would generate a different nonce. Server Component contexts cannot modify the proxy's response after it returns.

## Other renderers

Create and apply the policy where the framework renders the document. For React Router, both operations belong in `entry.server`; no Shopify request context is needed there. Pass the nonce to `renderToReadableStream` / `renderToPipeableStream`, `ServerRouter`, `Scripts`, `ScrollRestoration`, and Shopify's scripts. React context helpers remain app-owned. During hydration preserve the server nonce; read a script element's `.nonce` property, not `getAttribute('nonce')`. Don't generate another client nonce or replace the document's nonce during client navigation.

When rendering and response finalization happen in separate hooks, carry the policy object in framework request-local state and apply it in the finalizer.

For framework-native CSP, use the defaults getter with the framework's own nonce/hash lifecycle. Never generate one nonce at build time and reuse it across responses.

## Verification

In nonce mode, check that hydration and navigation work, framework/streaming and Shopify scripts share a nonce, and an unauthorized inline script is blocked. Separate document requests must get different nonces and return `Cache-Control: private, no-store`.

In nonce-free mode, verify the production shell remains prerendered, CSP leaves cache headers unchanged, authorized scripts execute, and scripts from disallowed external origins are blocked. In both modes, confirm incoming CSP headers cannot change the proxy's policy.
