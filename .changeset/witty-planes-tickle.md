---
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Add a hydration check for google web cache. This prevents an infinite redirect when viewing the cached version of a hydrogen site on Google.

Update your entry.server.jsx file to include this check:

```diff
+ if (!window.location.origin.includes("webcache.googleusercontent.com")) {
   startTransition(() => {
     hydrateRoot(
       document,
       <StrictMode>
         <RemixBrowser />
       </StrictMode>
     );
   });
+ }
```
