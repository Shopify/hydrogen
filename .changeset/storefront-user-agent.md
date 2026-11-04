---
"@shopify/hydrogen": patch
---

The Storefront API client sends `User-Agent: Hydrogen <version>` again when it runs on a server, like the Customer Account client and Hydrogen 2026.4. Since 2026.10.0 the client set no User-Agent, so Node sent `node`, workerd (the runtime under Oxygen) sent none, and Shopify couldn't tell these requests came from Hydrogen. In a browser, the client still leaves the User-Agent to the browser. The API proxies still forward the buyer's User-Agent.
