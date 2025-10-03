---
'@shopify/hydrogen': patch
'skeleton': patch
---

Add virtual resource route for Shopify monorail analytics endpoint

Adds `/.well-known/shopify/monorail/unstable/produce_batch` as a virtual resource route that proxies analytics requests from Shopify theme scripts to the configured Shopify store domain.

**Why**: In Multipass setups where users navigate between Hydrogen and Shopify theme subdomains, theme analytics scripts persist and attempt to POST to the Hydrogen domain. Without this route, these requests result in 404 errors and "did not provide an action" React Router errors in logs.

**Solution**: Virtual resource route proxies requests to `SHOPIFY_STORE_DOMAIN` when configured, preserving analytics data and eliminating runtime errors. Falls back to 204 No Content when domain not set.

Removed `Disallow: /.well-known/shopify/monorail` from robots.txt per Google's best practice - when endpoint returns `x-robots-tag: noindex` header (forwarded from Shopify), robots.txt Disallow is redundant and prevents crawlers from seeing the noindex directive.
