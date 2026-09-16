---
"@shopify/hydrogen": patch
---

The `hydrogen-setup` account-page step and the `hydrogen-customer-account` skill now point at the `hydrogen-local-https` skill (`npx hydrogen certs install`) when account routes fail with "Customer Account OAuth origin must use HTTPS", instead of leaving the fix unnamed.
