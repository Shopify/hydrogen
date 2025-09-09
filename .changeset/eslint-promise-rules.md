---
'skeleton': patch
---

Add TypeScript ESLint rules for promise handling to prevent Cloudflare Workers errors

Added `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` rules to help prevent "The script will never generate a response" errors when deploying to Oxygen/Cloudflare Workers. These rules ensure promises are properly handled with await, return, or void operators, as recommended by [Cloudflare's error documentation](https://developers.cloudflare.com/workers/observability/errors/#the-script-will-never-generate-a-response-errors).