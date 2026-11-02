# Content Security Policy

Call `createContentSecurityPolicy({requestContext, shop})` before rendering a document. Pass its `nonce` to the framework renderer, framework script components, and `ShopifyScripts` (or the core script-tag helpers). The normal final `requestContext.applyResponseHeaders(response.headers)` call sends the policy and prevents caching of nonce-bearing responses. Register only on requests where you want CSP applied; the context does not infer which routes render HTML.

The result is `{nonce, header}`. Create a new policy for each document response. Repeated calls with the same context and configuration return the same policy; changing configuration or nonce mode throws. Passing a request context opts into registration. Without one, apply the header yourself and prevent document caching when using a nonce. A stable policy created with `nonce: false` can also be used in framework header configuration.

## Customization

`directives` arrays extend defaults, as in classic Hydrogen. Custom sources come first and duplicate sources are removed. If a default consists only of `'none'`, the supplied array replaces it, so `frameAncestors: ["'self'"]` works without combining incompatible sources. `null` omits a directive; `undefined` retains its default. An empty array adds no sources to ordinary defaults. In nonce mode, the nonce is always included in `scriptSrc` and, when configured, `scriptSrcElem`, so these directives cannot contain `'none'`. Don't put nonce tokens in directive arrays; the creator owns nonce generation. Defaults allow inline styles for storefront components, but not inline script execution, event handlers, or script evaluation.

Pass only the additional sources your app needs:

```ts
const {nonce} = createContentSecurityPolicy({
  requestContext,
  shop,
  directives: {
    connectSrc: ['https://analytics.example.com'],
  },
});
```

`getShopifyCspDirectives(shop)` supplies the same defaults used by the creator, including development connections, for framework-native CSP configuration. Adapt its camelCase directive names and quoted source keywords to the framework's format. It does not generate nonces or hash inline scripts. Use framework-native configuration or construct your own header when you need exact replacement of the creator's defaults, such as removing its inline-style allowance.

Hydrogen's development build automatically adds local HTTP/HTTPS and WebSocket connections for `localhost` and `127.0.0.1`, plus WebSocket connections for `*.tryhydrogen.dev`, to the getter's `connectSrc` defaults. The creator inherits these defaults. The production build omits these sources. For framework config files loaded directly by Node, add `--conditions=development` to the Node command in development scripts; keep build and production commands without that flag. Custom `connectSrc` arrays retain these development defaults. Add other development origins explicitly, and add `'unsafe-eval'` to `scriptSrc` only if the framework's development runtime requires it. Keep framework-specific development allowances out of production. Add third-party resources and their network endpoints to the appropriate directives. Verify enabled Shopify features and third-party integrations with browser CSP enforcement active.

## Migrating from classic Hydrogen

Source arrays extend defaults in both versions, but the creator is not a drop-in replacement:

| Area | Classic | Current API |
| --- | --- | --- |
| Options | Directives are top-level properties alongside `shop`. | Move directive properties under `directives`; keep `shop` alongside `requestContext` and `nonce`. |
| Directive values | Accepts arrays, strings, and booleans. | Source directives accept arrays or `null`; use `null` to omit, `[]` for an empty directive without defaults, and booleans only for `upgradeInsecureRequests`. |
| Default policy | Relies on `defaultSrc` for scripts, images, fonts, media, and frames. | Uses `defaultSrc: ["'self'"]` and defines these directives separately, adds `objectSrc: ["'none'"]` and `scriptSrcAttr: ["'none'"]`, allows `data:` images, and adds Shopify connection/frame origins. A `defaultSrc` customization no longer authorizes these separately configured resource types. |
| Nonce placement | Adds the nonce to `scriptSrc` when an array is supplied, otherwise to `defaultSrc`. | Always adds it to `scriptSrc`, and also to a configured `scriptSrcElem`. Incoming headers never determine the nonce; manually supplied nonce sources are rejected. |
| React helpers | Returns a bound `NonceProvider`; exports `useNonce` and `Script`. | Returns `{nonce, header}`; React context stays in the app. Pass the nonce explicitly to framework scripts and `ShopifyScripts`. |
| Response lifecycle | The app applies the returned header. | Optional `requestContext` registration applies/forwards the policy, prevents nonce-bearing response caching, reuses equivalent calls, and rejects conflicting policies. `nonce: false` supports cached documents. |
| Development | Checks runtime `NODE_ENV`; adds localhost to style, default, and connection sources. | Uses the package's development export; adds local origins only to connection sources, including secure WebSockets. |

The current directive type adds `scriptSrcAttr`, `styleSrcElem`, and `styleSrcAttr`; it does not include classic's `pluginTypes`, `prefetchSrc`, `navigateTo`, or `blockAllMixedContent`. Malformed source tokens and contradictory `'none'` combinations throw instead of being passed through. Shop domains accept bare hosts or HTTPS origins and reject credentials, paths, or queries. Nonces remain 128-bit random values, now encoded as base64 instead of hexadecimal; Web Crypto is required, with no `Math.random()` fallback. Treat the nonce as an opaque string.

## CSP without nonces

Use `nonce: false` for a stable policy that can accompany cached HTML or a prerendered shell. This returns `nonce: undefined`, adds no nonce sources, and leaves cache headers unchanged. The request context's normal cookie and personalization rules still apply.

Inline scripts still need authorization. For a policy that permits inline scripts while restricting external origins, opt in explicitly:

```ts
createContentSecurityPolicy({
  requestContext,
  shop,
  nonce: false,
  directives: {
    scriptSrc: ["'unsafe-inline'"],
  },
});
requestContext.applyResponseHeaders(response.headers);
```

This allows injected inline JavaScript as well as the app's scripts. Hash-based CSP is a stricter alternative, but the framework must authorize every emitted inline script, including Shopify's bootstraps. If `scriptSrcElem` is configured, it controls script elements instead of `scriptSrc`. Adding nonce/hash sources or `'strict-dynamic'` can make browsers ignore `'unsafe-inline'`; do not mix these without accounting for all inline scripts.

## Next.js App Router

For a prerendered shell, use the nonce-free configuration above in `proxy.ts`, after handling Hydrogen-owned routes. Render `ShopifyScripts` without a nonce and avoid reading request headers solely for CSP in the layout. This preserves the shell's rendering model. See [Next's CSP guide](https://nextjs.org/docs/app/guides/content-security-policy).

Nonce CSP requires dynamic document rendering. Next cannot nonce scripts in a prerendered shell; putting only `ShopifyScripts` under Suspense does not solve this. Data can remain cached independently of the document.

For dynamic documents, create the policy once in the proxy, after handling Hydrogen-owned routes:

```ts
createContentSecurityPolicy({requestContext, shop});
const response = NextResponse.next({
  request: {headers: requestContext.getForwardedRequestHeaders()},
});
requestContext.applyResponseHeaders(response.headers);
return response;
```

With a registered policy, forwarded headers overwrite incoming `Content-Security-Policy` and remove the incoming report-only CSP request header. Next reads the enforcing CSP to nonce its own scripts. No separate nonce header is needed. Without a registered policy, Hydrogen leaves CSP headers alone; response report-only policies are also preserved.

In the dynamic layout, extract the nonce from the generated policy for Shopify's scripts. This small parser is app-owned and expects Hydrogen's single `script-src` nonce:

```tsx
const csp = (await headers()).get('Content-Security-Policy');
const scriptSources = csp
  ?.split(';')
  .map((directive) => directive.trim().split(/\s+/))
  .find(([name]) => name?.toLowerCase() === 'script-src')
  ?.slice(1);
const nonceSources = scriptSources?.filter((source) => /^'nonce-/i.test(source));
const nonce = nonceSources?.length === 1
  ? nonceSources[0]?.match(/^'nonce-([A-Za-z0-9+/_-]{22,}={0,2})'$/)?.[1]
  : undefined;
if (!nonce) throw new Error('Expected a CSP nonce generated by the proxy.');

return <ShopifyScripts {...scriptOptions} nonce={nonce} />;
```

Do not call the creator again in the layout: that would generate a different nonce. Keep the proxy active on every document-rendering path, including error pages. The request header is trusted only because the proxy overwrites it; parsing a client-supplied header does not establish provenance. Server Component contexts are separate objects and cannot modify the proxy's response after it returns.

## Other renderers

Share the request context through the handler and renderer. For React Router, pass the nonce to `renderToReadableStream` / `renderToPipeableStream`, `ServerRouter`, `Scripts`, `ScrollRestoration`, and Shopify's scripts. React context helpers remain app-owned. During hydration preserve the server nonce; read a script element's `.nonce` property, not `getAttribute('nonce')`. Don't generate another client nonce or replace the document's nonce during client navigation.

For framework-native CSP, use the defaults getter with the framework's own nonce/hash lifecycle. Never generate one nonce at build time and reuse it across responses.

## Verification

In nonce mode, check that hydration and navigation work, framework/streaming and Shopify scripts share a nonce, and an unauthorized inline script is blocked. Separate document requests must get different nonces and return `Cache-Control: private, no-store`.

In nonce-free mode, verify the production shell remains prerendered, CSP leaves cache headers unchanged, authorized scripts execute, and scripts from disallowed external origins are blocked. In both modes, confirm incoming CSP headers cannot change the proxy's policy.
