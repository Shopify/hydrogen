---
'@shopify/create-hydrogen': patch
---

Fix race condition in dev mode where create-hydrogen could fail when trying to copy CLI assets before they're created. Implements exponential backoff waiting mechanism to ensure assets exist before copying.