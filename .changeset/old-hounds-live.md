---
'@shopify/cli-hydrogen': patch
---

Support Node's `NODE_TLS_REJECT_UNAUTHORIZED` and `NODE_EXTRA_CA_CERTS` [environment variables](https://nodejs.org/api/cli.html#environment-variables) in the worker environment.

Use this at your own risk to disable certificate validation or provide additional CA certificates when making HTTPS requests from the worker:

```sh
# Disable certificate validation
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

# Provide additional CA certificates
NODE_EXTRA_CA_CERTS=/usr/.../ca-certificates/my-file.crt npm run dev
```
