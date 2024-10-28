---
'skeleton': patch
'@shopify/hydrogen': patch
---

Stabilize `getSitemap`, `getSitemapIndex` and implement on skeleton

1. Update the `getSitemapIndex` at `/app/routes/[sitemap.xml].tsx`

```diff
- import {unstable__getSitemapIndex as getSitemapIndex} from '@shopify/hydrogen';
+ import {getSitemapIndex} from '@shopify/hydrogen';
```

2. Update the `getSitemap` at `/app/routes/sitemap.$type.$page[.xml].tsx`

```diff
- import {unstable__getSitemap as getSitemap} from '@shopify/hydrogen';
+ import {getSitemap} from '@shopify/hydrogen';
```

For a reference implementation please see the skeleton template sitemap routes
