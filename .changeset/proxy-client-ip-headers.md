---
"@shopify/hydrogen": patch
---

The `/__shopify` proxy, the `.well-known` proxy, and the UCP MCP proxy at `/api/ucp/mcp` no longer forward client IP and forwarding headers from the incoming request: `Forwarded`, `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Real-IP`, `True-Client-IP`, `X-Client-IP`, `X-Shopify-Client-IP`, `Oxygen-Buyer-IP`, and `Shopify-Storefront-Buyer-IP`. Callers can set these headers to any value. The Storefront API proxy still sends `Shopify-Storefront-Buyer-IP` from `requestContext.buyerIp`.
