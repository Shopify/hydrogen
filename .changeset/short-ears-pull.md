---
'@shopify/mini-oxygen': minor
'@shopify/cli-hydrogen': patch
---

Add support for HTTP proxies with the environment variables `SHOPIFY_HTTP_PROXY` and `SHOPIFY_HTTPS_PROXY`. Define one of these variables before starting the Hydrogen dev server to make all requests go through a proxy server.

If your proxy uses authentication, provide the auth in the following format:

```bash
SHOPIFY_HTTP_PROXY=http://user:pass@yourproxy.com:PORT
```
