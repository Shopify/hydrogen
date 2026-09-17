---
"@shopify/hydrogen": patch
---

Require a server-issued, host-bound cart cookie before attaching Customer Account identity to an existing cart. Cart handlers establish this binding only for carts they create on a trusted HTTPS origin, and update it when an already-bound cart rotates; preserve both `Set-Cookie` headers. Legacy and externally supplied carts remain usable but are not automatically linked on login or refresh. Keep logout cleanup working when the visible cart cookie changes, and expire both cart cookies if detachment fails.
