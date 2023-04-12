---
'demo-store': patch
---

Carts created in liquid will soon be compatible with the Storefront API and vice versa, making it possible to share carts between channels.

This change updates the Demo Store to use Online Store's `cart` cookie (instead of sessions) which prevents customers from losing carts when merchants migrate to/from Hydrogen.
