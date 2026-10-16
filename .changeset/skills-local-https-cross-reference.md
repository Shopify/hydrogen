---
"@shopify/hydrogen": patch
---

The `hydrogen-setup` account-page step now points at the `hydrogen-local-https` skill when account routes fail with "Customer Account OAuth origin must use HTTPS", instead of telling agents to skip signed-in checks without naming the fix.
