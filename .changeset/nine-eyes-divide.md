---
'@shopify/cli-hydrogen': patch
---

Add `--force-client-sourcemap` flag. Client sourcemapping is avoided by default because it makes backend code visible in the browser. Use this flag to force enabling it.
It is recommended to delete client sourcemaps before deploying the app to production.
